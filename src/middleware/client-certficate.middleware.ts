import {
  Injectable,
  NestMiddleware,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ClientCertificateMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ClientCertificateMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // For HTTPS requests with client certificates, Express adds a 'client' property
    // to the request object that contains certificate information
    const clientCert = (req as any).connection.getPeerCertificate();

    if (!clientCert || Object.keys(clientCert).length === 0) {
      this.logger.warn('Request received without client certificate');
      throw new UnauthorizedException('Client certificate required');
    }

    // Check if the certificate is from Meta (you may want to add more validation)
    if (!this.isMetaCertificate(clientCert)) {
      this.logger.warn('Invalid client certificate received');
      throw new UnauthorizedException('Invalid client certificate');
    }

    this.logger.log('Valid Meta client certificate verified');
    next();
  }

  private isMetaCertificate(cert: any): boolean {
    // Implement certificate validation logic
    // This could check the certificate issuer, subject, or other properties
    // Example validation (replace with actual Meta certificate details):
    return (
      cert.subject?.O === 'Meta Platforms, Inc.' ||
      cert.issuer?.O === 'Meta Platforms, Inc.' ||
      cert.subject?.CN?.includes('meta.com')
    );
  }
}
