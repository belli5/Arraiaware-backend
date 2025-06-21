import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

class UserImportItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  unidade: string;
}

export class ImportUsersDto {
  @ApiProperty({ type: [UserImportItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserImportItemDto)
  users: UserImportItemDto[];
}