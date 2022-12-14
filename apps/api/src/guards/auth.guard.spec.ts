// External dependencies
import { ExecutionContext, HttpException } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';

// Internal dependencies
import { AuthGuard } from './auth.guard';
import getAccessToken from '$src/../test/helpers/getAccessToken.helper';

describe('AuthGuard', () => {
	let authGuard: AuthGuard;
	let mockContext: any;

	beforeEach(async () => {
		authGuard = new AuthGuard();
		mockContext = createMock<ExecutionContext>();
	});

	it('should be defined', () => {
		expect(authGuard).toBeDefined();
	});

	it('should return false when not passing token', async () => {
		await expect(authGuard.canActivate(mockContext)).rejects.toThrow(HttpException);
	});

	it('should return false when passing invalid token', async () => {
		mockContext.switchToHttp().getRequest.mockReturnValue({
			headers: {
				authorization: 'Bearer invalidToken'
			}
		});
		await expect(authGuard.canActivate(mockContext)).rejects.toThrow(HttpException);
	});

	it('should return true since token is valid', async () => {
		const accessToken: string = await getAccessToken();

		mockContext.switchToHttp().getRequest.mockReturnValue({
			headers: {
				authorization: `Bearer ${accessToken}`
			}
		});

		const result: boolean = await authGuard.canActivate(mockContext);
		expect(result).toEqual(true);
	});
});
