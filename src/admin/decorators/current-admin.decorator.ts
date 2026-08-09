import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminPrincipal } from '../interfaces/admin-principal.interface';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminPrincipal | undefined => {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AdminPrincipal }>();
    return request.user;
  },
);
