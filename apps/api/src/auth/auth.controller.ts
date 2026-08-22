import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { prisma } from '@recoverai/database';
import {
  generateSessionToken,
  hashSessionToken,
  verifyPassword,
} from '@recoverai/auth';
import { LoginSchema } from '@recoverai/validation';
import { AuditService } from '@recoverai/audit';

@Controller('auth')
export class AuthController {
  @Post('login')
  public async login(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const validated = LoginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: { organization: true },
    });

    if (!user || !user.isActive) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    const isValidPassword = await verifyPassword(
      validated.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    // Create session
    const rawToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

    await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: tokenHash,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        expiresAt,
      },
    });

    // Set secure httpOnly cookie
    res.cookie('recoverai_session', rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    await AuditService.record({
      organizationId: user.organizationId,
      actorType: 'USER',
      actorId: user.id,
      action: 'auth.login_success',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: req.ip,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
        },
      },
    };
  }

  @Post('logout')
  public async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const rawToken = req.cookies?.['recoverai_session'];
    if (rawToken) {
      const tokenHash = hashSessionToken(rawToken);
      await prisma.session.updateMany({
        where: { sessionToken: tokenHash },
        data: { isRevoked: true },
      });
    }

    res.clearCookie('recoverai_session');
    return { success: true };
  }

  @Get('me')
  public async getMe(@Req() req: Request) {
    const rawToken = req.cookies?.['recoverai_session'];
    if (!rawToken) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const tokenHash = hashSessionToken(rawToken);
    const session = await prisma.session.findUnique({
      where: { sessionToken: tokenHash },
      include: {
        user: {
          include: { organization: true },
        },
      },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new HttpException('Session expired', HttpStatus.UNAUTHORIZED);
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        fullName: session.user.fullName,
        role: session.user.role,
        organization: {
          id: session.user.organization.id,
          name: session.user.organization.name,
          slug: session.user.organization.slug,
        },
      },
    };
  }
}
