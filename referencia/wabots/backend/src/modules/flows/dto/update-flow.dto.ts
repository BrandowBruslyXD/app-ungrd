import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { FlowGraph } from '../../../common/types/engine.types';

/**
 * DTO para actualizar un flujo: todos los campos son opcionales. Se define
 * explícitamente (en vez de PartialType de CreateFlowDto) porque NO admite
 * `tenantId`: un flujo no cambia de empresa al actualizarse.
 */
export class UpdateFlowDto {
  // Nombre del flujo.
  @IsOptional()
  @IsString()
  name?: string;

  // Descripción libre.
  @IsOptional()
  @IsString()
  description?: string;

  // Marca el flujo como plantilla reutilizable.
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  // Grafo serializado { nodes, edges }. Se valida en el servicio.
  @IsOptional()
  @IsObject()
  graph?: FlowGraph;
}
