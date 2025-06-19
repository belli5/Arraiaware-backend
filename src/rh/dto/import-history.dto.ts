import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

class HistoryItemDto {
  @ApiProperty()
  @IsEmail()
  userEmail: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cycleName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  criterionName: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  justification: string;

  @ApiProperty({ enum: ['SELF', 'PEER'] })
  @IsIn(['SELF', 'PEER'])
  evaluationType: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  evaluatorEmail?: string;
}

export class ImportHistoryDto {
  @ApiProperty({ type: [HistoryItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoryItemDto)
  records: HistoryItemDto[];
}