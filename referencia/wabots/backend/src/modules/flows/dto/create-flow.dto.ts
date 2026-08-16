import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { FlowGraph } from '../../../common/types/engine.types';

/**
 * DTO para crear un flujo. Si `tenantId` es null/ausente => plantilla global.
 */
export class CreateFlowDto {
  // Nombre del flujo (requerido).
  @IsString()
  name: string;

  // Tenant dueño del flujo. Opcional: si no viene, es plantilla reutilizable.
  @IsOptional()
  @IsString()
  tenantId?: string;

  // Descripción libre del flujo.
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
