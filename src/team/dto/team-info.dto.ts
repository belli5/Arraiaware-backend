import { ApiProperty } from '@nestjs/swagger';

export class TeamMemberDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;
}

export class TeamInfoDto {
  @ApiProperty()
  projectId: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty({ format: 'uuid' }) 
  managerId: string;

  @ApiProperty({ example: 'Carlos Mendes' })
  managerName: string;

  @ApiProperty({ type: [TeamMemberDto] })
  collaborators: TeamMemberDto[];
}
