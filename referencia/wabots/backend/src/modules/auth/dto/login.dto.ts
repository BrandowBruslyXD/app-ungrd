import { IsBoolean, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  // Reemplaza una sesión activa en otro dispositivo (confirmado en el overlay).
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
