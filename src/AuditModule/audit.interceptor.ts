import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUDIT_KEY } from './audit.decorator';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService, private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<string>(AUDIT_KEY, context.getHandler());
    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { user, ip, params, query, body } = request;

   
    return next.handle().pipe(
      tap((data) => { 
        this.auditService.log({
          action,
          userId: user?.id,
          entityId: params?.id,
          ipAddress: ip,
          
          details: { 
            request: { query, body },
            responseSummary: data 
          }, 
        });
      }),
    );
  }
}