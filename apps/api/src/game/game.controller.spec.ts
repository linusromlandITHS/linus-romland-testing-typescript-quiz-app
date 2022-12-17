// External dependencies
import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

// Internal dependencies
import getAccessToken from '$src/../test/helpers/getAccessToken.helper';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameInformation } from '_packages/shared/src/types';
import validateGame from '$src/../test/helpers/validateGame.helper';

describe('GameController', () => {
	let controller: GameController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [GameController],
			providers: [GameService]
		}).compile();

		controller = module.get<GameController>(GameController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	it('should create a game', async () => {
		const accessToken: string = await getAccessToken();

		const result: GameInformation = await controller.createGame(`Bearer ${accessToken}`);
		validateGame(result);
	});

	it('should join a game', async () => {
		const accessToken: string = await getAccessToken();

		const createGameResult: GameInformation = await controller.createGame(`Bearer ${accessToken}`);
		const gameId: string = createGameResult.id;

		const result: GameInformation | HttpStatus = await controller.joinGame(`Bearer ${accessToken}`, gameId);

		//Should fail since same user is joining
		expect(result).toBe(HttpStatus.NOT_FOUND);
	});
});
