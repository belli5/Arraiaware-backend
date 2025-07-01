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

  @ApiProperty({ type: [TeamMemberDto] })
  collaborators: TeamMemberDto[];
}
