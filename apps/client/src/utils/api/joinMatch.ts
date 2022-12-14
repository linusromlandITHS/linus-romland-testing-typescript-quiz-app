// External Dependencies
import { AxiosResponse } from 'axios';

// Internal Dependencies
import { GameInformation } from '_packages/shared/src/types';
import { HTTPError } from '$src/types';
import api from './api';

export default async function joinMatch(gameId: string): Promise<GameInformation | HTTPError> {
	const response: AxiosResponse = await api.get(`/game/${gameId}`);

	return response.data;
}
