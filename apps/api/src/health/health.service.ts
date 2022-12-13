// External dependencies
import { Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';

// Internal dependencies
import axios from '$src/utils/axios';
import { HealthResult } from '_packages/shared-types';
import { TRIVIA_API_URL } from '$src/utils/constants';

@Injectable()
export class HealthService {
	async getHealth(): Promise<HealthResult> {
		const triviaResponse: AxiosResponse = await axios.get(`${TRIVIA_API_URL}/questions?limit=0`);

		return {
			api: { running: true },
			triviaAPI: { running: triviaResponse.status === 200 }
		};
	}
}
