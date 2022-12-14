// External dependencies
import { Injectable, Logger } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { Socket } from 'socket.io';

// Internal dependencies
import { GameInformation, Player, Question, WebSocketEvent } from '_packages/shared/src/types';
import { GameStatus, PlayerStatus } from '_packages/shared/src/enums';
import generateGameId from '$src/utils/generateGameId';
import getUserInformation from '$src/utils/getUserInformation';
import axios from '$src/utils/axios';
import { TRIVIA_API_URL } from '$src/utils/constants';
import { QUESTION_INTRO_TIME } from '_packages/shared/src/constants';
import {
	DEFAULT_QUESTION_COUNT,
	DEFAULT_QUESTION_TIME,
	DEFAULT_QUESTION_REGION,
	DEFAULT_QUESTION_DIFFICULTY,
	DEFAULT_QUESTION_CATEGORY,
	QUESTION_MAX_PLAYERS
} from '$src/utils/env';
import calculateScore from '$src/utils/calculateScore';

const _games: GameInformation[] = [];

@Injectable()
export class GameService {
	private readonly logger = new Logger(GameService.name);

	async createGame(token: string): Promise<GameInformation> {
		const user: Player = getUserInformation(token); // Get the user's information from the auth server

		if (!user) return null; // If the user doesn't exist, return null

		const game: GameInformation = {
			id: generateGameId(_games.map((game: GameInformation) => game.id)), // Generate a unique game ID
			status: GameStatus.LOBBY,
			settings: {
				isPrivate: true,
				// Set the default settings
				questionCount: DEFAULT_QUESTION_COUNT,
				questionTime: DEFAULT_QUESTION_TIME,
				region: DEFAULT_QUESTION_REGION,
				category: DEFAULT_QUESTION_CATEGORY,
				difficulty: DEFAULT_QUESTION_DIFFICULTY
			},
			questions: [],
			previousQuestions: [],
			answers: {},
			players: [
				// Add the host to the player list
				{
					...user,
					status: PlayerStatus.HOST
				}
			]
		};

		_games.push(game); // Add the game to the list of games

		return game; // Return the game
	}

	async joinGame(token: string, gameId: string, user?: Player): Promise<GameInformation> {
		if (!user) user = getUserInformation(token); // Get the user's information from the auth server

		if (!user) return null; // If the user doesn't exist, return null

		const game: GameInformation = _games.find((game: GameInformation) => game.id === gameId); // Find the game

		if (!game) return null; // If the game doesn't exist, return null

		if (game.status != GameStatus.LOBBY) return; // If the game isn't in the joining phase, return null

		if (game.players.length >= QUESTION_MAX_PLAYERS) return; // If the game is full, return null

		if (!game.players.find((player: Player) => player.id === user.id) && !game.settings.isPrivate)
			game.players.push({
				...user,
				status: PlayerStatus.NOT_READY
			}); // If the user isn't already in the game, add them

		//If player is not the host and the game is private, return null
		if (
			game.settings.isPrivate &&
			game.players.find((player: Player) => player.id === user.id).status !== PlayerStatus.HOST
		)
			return;

		return game; // Return the game
	}

	async gameExists(token: string, gameId: string): Promise<boolean> {
		const user: Player = getUserInformation(token); // Get the user's information from the auth server

		if (!user) return null; // If the user doesn't exist, return null

		const game: GameInformation = _games.find((game: GameInformation) => game.id === gameId); // Find the game

		if (!game) return null; // If the game doesn't exist, return null

		return game.settings.isPrivate ? false : true; // , check if the user is in the game
	}

	async leaveGame(token: string, client: Socket): Promise<void> {
		const user: Player = getUserInformation(token); // Get the user's information from the auth server

		if (!user) return null; // If the user doesn't exist, return null

		this.logger.log(`User ${user.name} left the game`);

		//Remove the user from all the games
		for (let i: number = 0; i < _games.length; i++) {
			if (_games[i].players.find((player: Player) => player.id === user.id)) {
				//Find index of the player
				const playerIndex: number = _games[i].players.findIndex((player: Player) => player.id === user.id);

				//If player is the host, remove the game
				if (_games[i].players[playerIndex].status === PlayerStatus.HOST) {
					_games[i].status = GameStatus.CLOSED;

					const gameData: string = JSON.stringify({
						..._games[i],
						timeout: undefined,
						questions: []
					});

					client.broadcast.emit(_games[i].id, gameData);
					_games.splice(i, 1);
					i--;
				} else {
					_games[i].players.splice(playerIndex, 1);
					const gameData: string = JSON.stringify({
						..._games[i],
						timeout: undefined,
						questions: []
					});
					client.broadcast.emit(_games[i].id, gameData);
				}
			}
		}
	}

	async changeSettings(data: WebSocketEvent, user: Player): Promise<GameInformation> {
		const game: GameInformation = _games.find((game: GameInformation) => game.id === data.gamePin); // Find the game

		if (!game) return null; // If the game doesn't exist, return null

		if (game.status !== GameStatus.LOBBY) return null; // If the game isn't in the joining phase, return null

		const player: Player = game.players.find((player: Player) => player.id === user.id); // Find the player

		if (!player) return null; // If the player doesn't exist, return null

		if (player.status !== PlayerStatus.HOST) return null; //Check if the player is not the host

		//Loop through all the settings keys and update the game's settings as a for in loop
		for (const key in data.settings) {
			game.settings[key] = data.settings[key];
		}

		return game; // Return the game
	}

	async changePlayerStatus(data: WebSocketEvent, user: Player): Promise<GameInformation> {
		const game: GameInformation = _games.find((game: GameInformation) => game.id === data.gamePin); // Find the game

		if (!game) return null; // If the game doesn't exist, return null

		if (game.status !== GameStatus.LOBBY) return null; // If the game isn't in the joining phase, return null

		const player: Player = game.players.find((player: Player) => player.id === user.id); // Find the player

		if (!player) return null; // If the player doesn't exist, return null

		if (player.status == PlayerStatus.HOST) return null; //Check if the player the host

		//Update the player's status
		game.players.find((player: Player) => player.id === user.id).status = data.status;

		return game; // Return the game
	}

	async startGame(data: WebSocketEvent, user: Player, client: Socket): Promise<GameInformation | void> {
		const game: GameInformation = _games.find((game: GameInformation) => game.id === data.gamePin); // Find the game

		if (!game) return null; // If the game doesn't exist, return null

		const player: Player = game.players.find((player: Player) => player.id === user.id); // Find the player

		if (!player) return null; // If the player doesn't exist, return null

		if (player.status !== PlayerStatus.HOST) return null; //Check if the player is not the host

		let triviaURL: string = `${TRIVIA_API_URL}/questions?limit=${game.settings.questionCount}&region=${game.settings.region}&categories=${game.settings.category}&difficulty=${game.settings.difficulty}`;

		if (game.settings.tag) triviaURL += `&tags=${game.settings.tag}`;

		//Get the questions from the trivia API
		const response: AxiosResponse = await axios.get(triviaURL);

		if (response.status !== 200) return null; // If the response isn't 200, return null

		if (response.data.length < game.settings.questionCount) return null; // If the response doesn't have enough questions, return null

		// Set the game's questions to the response data
		game.questions = response.data.map(
			(q: { id: string; question: string; incorrectAnswers: string; correctAnswer: string }) => ({
				// Set the game's questions to the response data
				questionId: q.id,
				question: q.question,
				answers: [...q.incorrectAnswers, q.correctAnswer].sort(() => Math.random() - 0.5), // Shuffle the answers
				correctAnswer: q.correctAnswer
			})
		);

		return await this.nextQuestion(data, user, client); // Return the game
	}

	async nextQuestion(data: WebSocketEvent, user: Player, client: Socket): Promise<GameInformation | void> {
		const game: GameInformation = _games.find((g: GameInformation) => g.id === data.gamePin); // Find the game

		if (!game) return null; // If the game doesn't exist, return null

		const player: Player = game.players.find((player: Player) => player.id === user.id); // Find the player

		if (!player) return null; // If the player doesn't exist, return null

		if (player.status !== PlayerStatus.HOST) return null; //Check if the player is not the host

		//If there are no more questions, return the game with the question as the current question and empty question array
		if (game.previousQuestions.length >= game.settings.questionCount)
			return changeToLeaderboard(true, data.gamePin, client);

		//Set a timeout to show the correct answer and leaderboard
		game.status = GameStatus.QUESTION;
		game.timeout = setTimeout(
			() => changeToLeaderboard(false, data.gamePin, client),
			game.settings.questionTime * 1000 + QUESTION_INTRO_TIME
		);

		//Return game with the question as the current question and empty question array
		const question: Question = game.questions[game.previousQuestions.length];
		game.activeQuestion = {
			...question,
			correctAnswer: null,
			sentAt: Date.now()
		};

		return game;
	}

	async answerQuestion(data: WebSocketEvent, user: Player, client: Socket): Promise<void> {
		const game: GameInformation = _games.find((game: GameInformation) => game.id === data.gamePin); // Find the game

		if (!game) return null; // If the game doesn't exist, return null

		const player: Player = game.players.find((player: Player) => player.id === user.id); // Find the player

		if (!player) return null; // If the player doesn't exist, return null

		if (!game.activeQuestion) return null; // If there is no active question, return null

		if (game.activeQuestion.sentAt + QUESTION_INTRO_TIME > Date.now()) return null; //Check that game.activeQuestion.sentAt is after QUESTION_INTRO_TIME

		if (game.activeQuestion.questionId !== data.questionId) return null; //Check that the player is answering the active question

		const question: Question = game.questions.find((q: Question) => q.questionId === data.questionId); // Find the question

		if (!question) return null; // If the question doesn't exist, return null

		if (game.answers[question.questionId] && game.answers[question.questionId][player.id]) return null; //If the player has already answered the question, return null

		//Create the question object if it doesn't exist
		if (!game.answers[question.questionId]) {
			game.answers[question.questionId] = {};
		}

		game.answers[question.questionId][player.id] = {
			answer: data.answer,
			correct: data.answer === question.correctAnswer,
			time: Date.now() - game.activeQuestion.sentAt - QUESTION_INTRO_TIME
		};

		//If all players have answered the question, show the correct answer
		if (Object.keys(game.answers[question.questionId]).length === game.players.length)
			changeToLeaderboard(false, data.gamePin, client);
	}
}

function changeToLeaderboard(endGame: boolean = false, gamePin: string, client: Socket): void {
	const updatedGame: GameInformation = _games.find((g: GameInformation) => g.id === gamePin);
	if (!updatedGame) return;
	if (updatedGame.timeout) clearTimeout(updatedGame.timeout);
	updatedGame.status = GameStatus.LEADERBOARD;
	updatedGame.previousQuestions.push(updatedGame.questions[updatedGame.previousQuestions.length]);
	updatedGame.activeQuestion = null;

	//Calculate the scores
	for (const player of updatedGame.players) {
		let score: number = 0;
		let streak: number = 0;
		//Loop through the keys of the answers
		for (const key in updatedGame.answers) {
			//If the key is the player's id and the answer is correct, add 1 to the correct answer
			if (!updatedGame.answers[key][player.id].correct) {
				streak = 0;
				continue;
			}
			streak++;

			const responseTime: number = updatedGame.answers[key][player.id].time / 1000;

			score += calculateScore(responseTime, updatedGame.settings.questionTime, streak);
		}
		player.score = score;
	}

	//Sort the players by score
	updatedGame.players.sort((a: Player, b: Player) => b.score - a.score);

	const socketData: string = JSON.stringify({
		...updatedGame,
		timeout: undefined,
		questions: []
	});

	client.emit(updatedGame.id, socketData);
	client.broadcast.emit(updatedGame.id, socketData);

	if (endGame) {
		//Remove the game from the list of games
		_games.splice(_games.indexOf(updatedGame), 1);
		return;
	}
}
