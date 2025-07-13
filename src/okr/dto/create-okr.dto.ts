import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';

class CreateKeyResultDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;
}

export class CreateOkrDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsUUID()
  cycleId: string;

  @ApiProperty({ type: [CreateKeyResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateKeyResultDto)
  keyResults: CreateKeyResultDto[];
}