import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import {
  FlowGraph,
  FlowNode,
  NodeType,
} from '../../common/types/engine.types';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { VALID_NODE_TYPES } from '../flow-agent/node-catalog';
import {
  decryptGraphSecrets,
  encryptGraphSecrets,
  maskGraphSecrets,
  preserveEmptySecrets,
} from './flow-secrets';
import { GraphIssues, inspectGraph } from './graph-rules';

// Tipos de nodo válidos. Fuente única: el catálogo del flow-agent (derivado de
// NODE_CATALOG), para que validación y constructor no puedan divergir.
const NODE_TYPES: NodeType[] = VALID_NODE_TYPES;

/**
 * Lógica de negocio de flujos: CRUD, plantillas y validación del grafo.
 */
@Injectable()
export class FlowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /** Crea un flujo. Valida el grafo y cifra sus secretos en reposo. */
  async create(dto: CreateFlowDto) {
    // Coherencia del grafo: se informa, no se bloquea (un flujo en construcción
    // tiene nodos sueltos de forma legítima). Ver graph-rules.ts.
    const issues = dto.graph ? inspectGraph(dto.graph) : undefined;
    const graph = dto.graph
      ? encryptGraphSecrets(this.validatedGraph(dto.graph), this.crypto)
      : undefined;

    const flow = await this.prisma.flow.create({
      data: {
        name: dto.name,
        tenantId: dto.tenantId,
        description: dto.description,
        isTemplate: dto.isTemplate ?? false,
        ...(graph ? { graph: graph as unknown as Prisma.InputJsonValue } : {}),
      },
    });
    return { ...this.withMaskedGraph(flow), ...(issues ? { issues } : {}) };
  }

  /** Lista flujos (para el cliente: secretos ENMASCARADOS). */
  async findAll(tenantId?: string) {
    const flows = await this.prisma.flow.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { updatedAt: 'desc' },
    });
    return flows.map((flow) => this.toListItem(flow));
  }

  /** Lista únicamente las plantillas reutilizables (sin grafo). */
  async findTemplates() {
    const flows = await this.prisma.flow.findMany({
      where: { isTemplate: true },
      orderBy: { updatedAt: 'desc' },
    });
    return flows.map((flow) => this.toListItem(flow));
  }

  /**
   * Proyección de LISTADO: metadatos + conteo de nodos, SIN el grafo. El JSON
   * completo del flujo (prompts, estructura del bot de cada empresa) solo se
   * expone al abrir el flujo en el editor (findOneForClient), no en listados.
   */
  private toListItem(flow: { graph: unknown } & Record<string, any>) {
    const { graph, ...meta } = flow;
    const nodes = (graph as FlowGraph | null)?.nodes;
    return { ...meta, nodesCount: Array.isArray(nodes) ? nodes.length : 0 };
  }

  /**
   * Devuelve un flujo por id con su grafo DESCIFRADO (secretos en claro).
   * USO INTERNO del motor/simulador — NUNCA se devuelve directo al cliente.
   * Para respuestas al cliente usar findOneForClient.
   */
  async findOne(id: string) {
    const flow = await this.prisma.flow.findUnique({ where: { id } });
    if (!flow) {
      throw new NotFoundException(`Flujo ${id} no encontrado`);
    }
    return this.withDecryptedGraph(flow);
  }

  /** Igual que findOne pero con secretos ENMASCARADOS (para el cliente). */
  async findOneForClient(id: string) {
    return this.withMaskedGraph(await this.findOne(id));
  }

  /** Actualiza un flujo. Al cambiar el grafo lo valida, cifra e incrementa versión. */
  async update(id: string, dto: UpdateFlowDto) {
    const existing = await this.findOne(id); // grafo previo DESCIFRADO
    const issues: GraphIssues | undefined = dto.graph ? inspectGraph(dto.graph) : undefined;

    const graph = dto.graph
      ? encryptGraphSecrets(
          // Preserva las apiKeys que llegaron vacías (venían enmascaradas).
          preserveEmptySecrets(this.validatedGraph(dto.graph), existing.graph as FlowGraph),
          this.crypto,
        )
      : undefined;

    const data: Prisma.FlowUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.isTemplate !== undefined ? { isTemplate: dto.isTemplate } : {}),
      ...(graph
        ? {
            graph: graph as unknown as Prisma.InputJsonValue,
            version: { increment: 1 },
          }
        : {}),
    };

    const flow = await this.prisma.flow.update({ where: { id }, data });
    return { ...this.withMaskedGraph(flow), ...(issues ? { issues } : {}) };
  }

  /**
   * Elimina un flujo y limpia las referencias `activeFlowId` colgantes, para que
   * ningún tenant quede apuntando a un flujo inexistente (bot en estado zombie).
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.tenant.updateMany({
        where: { activeFlowId: id },
        data: { activeFlowId: null },
      });
      return tx.flow.delete({ where: { id } });
    });
  }

  /** Valida el grafo y lo devuelve tipado (lanza BadRequest si es inválido). */
  private validatedGraph(graph: FlowGraph): FlowGraph {
    this.validateGraph(graph);
    return graph;
  }

  /** Devuelve el flujo con su grafo tipado y descifrado (uso interno). */
  private withDecryptedGraph<T extends { graph: unknown }>(flow: T) {
    return {
      ...flow,
      graph: decryptGraphSecrets(flow.graph as unknown as FlowGraph, this.crypto),
    };
  }

  /** Devuelve el flujo con secretos ENMASCARADOS (para el cliente). */
  private withMaskedGraph<T extends { graph: unknown }>(flow: T) {
    const decrypted = decryptGraphSecrets(flow.graph as unknown as FlowGraph, this.crypto);
    return { ...flow, graph: maskGraphSecrets(decrypted) };
  }

  /**
   * Valida la estructura del grafo. Lanza BadRequestException si es inválido.
   * - nodes y edges deben ser arrays.
   * - cada node con id, type (∈ catálogo) y position { x, y }.
   * - cada edge con source y target que apunten a nodes existentes.
   */
  private validateGraph(graph: FlowGraph): void {
    if (!graph || typeof graph !== 'object') {
      throw new BadRequestException('El grafo debe ser un objeto');
    }

    if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
      throw new BadRequestException(
        'El grafo debe contener los arrays "nodes" y "edges"',
      );
    }

    const nodeIds = new Set<string>();

    graph.nodes.forEach((node: FlowNode, index: number) => {
      if (!node || typeof node !== 'object') {
        throw new BadRequestException(`Nodo inválido en posición ${index}`);
      }
      if (!node.id || typeof node.id !== 'string') {
        throw new BadRequestException(
          `El nodo en posición ${index} carece de "id" válido`,
        );
      }
      if (!node.type || !NODE_TYPES.includes(node.type)) {
        throw new BadRequestException(
          `El nodo "${node.id}" tiene un type inválido: "${node.type}"`,
        );
      }
      if (
        !node.position ||
        typeof node.position.x !== 'number' ||
        typeof node.position.y !== 'number'
      ) {
        throw new BadRequestException(
          `El nodo "${node.id}" carece de "position" válida { x, y }`,
        );
      }
      if (nodeIds.has(node.id)) {
        throw new BadRequestException(`Id de nodo duplicado: "${node.id}"`);
      }
      nodeIds.add(node.id);
    });

    graph.edges.forEach((edge, index: number) => {
      if (!edge || typeof edge !== 'object') {
        throw new BadRequestException(`Edge inválido en posición ${index}`);
      }
      if (!edge.source || !edge.target) {
        throw new BadRequestException(
          `El edge en posición ${index} requiere "source" y "target"`,
        );
      }
      if (!nodeIds.has(edge.source)) {
        throw new BadRequestException(
          `El edge "${edge.id ?? index}" apunta a un source inexistente: "${edge.source}"`,
        );
      }
      if (!nodeIds.has(edge.target)) {
        throw new BadRequestException(
          `El edge "${edge.id ?? index}" apunta a un target inexistente: "${edge.target}"`,
        );
      }
    });
  }
}
