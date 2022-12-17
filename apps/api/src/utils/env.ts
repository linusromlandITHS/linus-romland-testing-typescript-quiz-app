const AUTH0_DOMAIN: string = process.env.AUTH0_DOMAIN;
const AUTH0_TEST_USERNAME: string = process.env.AUTH0_TEST_USERNAME;
const DEFAULT_QUESTION_COUNT: number = Number(process.env.DEFAULT_QUESTION_COUNT) || 10;
const DEFAULT_QUESTION_TIME: number = Number(process.env.DEFAULT_QUESTION_TIME) || 30;
const DEFAULT_QUESTION_REGION: string = process.env.DEFAULT_QUESTION_REGION || 'SE';
const DEFAULT_QUESTION_DIFFICULTY: string = process.env.DEFAULT_QUESTION_DIFFICULTY || 'easy';
const DEFAULT_QUESTION_CATEGORY: string = process.env.DEFAULT_QUESTION_CATEGORY || 'movies';
const QUESTION_MAX_POSSIBLE_POINTS: number = Number(process.env.QUESTION_MAX_POSSIBLE_POINTS) || 1000;

export {
	AUTH0_DOMAIN,
	AUTH0_TEST_USERNAME,
	DEFAULT_QUESTION_COUNT,
	DEFAULT_QUESTION_TIME,
	DEFAULT_QUESTION_REGION,
	DEFAULT_QUESTION_DIFFICULTY,
	DEFAULT_QUESTION_CATEGORY,
	QUESTION_MAX_POSSIBLE_POINTS
};
