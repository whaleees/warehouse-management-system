import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { roleSatisfies } from './roles.hierarchy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Inheritance-aware check: a role passes if its grants (see ROLE_GRANTS)
    // include any of the required roles, so MANAGER automatically satisfies
    // STAFF/VIEWER endpoints without listing every role on each route.
    if (!roleSatisfies(user.role, requiredRoles)) {
      throw new ForbiddenException('Forbidden: insufficient role');
    }

    return true;
  }
}
