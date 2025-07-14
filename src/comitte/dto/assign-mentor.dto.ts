import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class AssignMentorDto {
  @ApiProperty({
    description: 'ID do usuário que será o mentor. Envie null para remover o mentor.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  mentorId: string | null;
}