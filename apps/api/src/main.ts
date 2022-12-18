// External dependencies
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

// Internal dependencies
import { AppModule } from './app.module';
import { PORT } from '$src/utils/env';

async function bootstrap(): Promise<void> {
	const app: NestFastifyApplication = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
	app.enableCors({
		origin: true,
		credentials: true
	});
	await app.listen(PORT);
}
bootstrap();
