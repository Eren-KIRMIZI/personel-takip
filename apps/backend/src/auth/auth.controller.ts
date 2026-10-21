import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Public()
  @Get('warmup')
  async warmup() {
    return this.authService.warmupDatabase();
  }

  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Oturumdaki kullanıcı bilgisi' })
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      employeeId: user.employeeId,
      roles: user.roles,
      permissions: [...user.permissions],
    };
  }
}