//External dependencies
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth0 } from '@auth0/auth0-react';
import { Socket } from 'socket.io-client';
import { NavigateFunction, useNavigate } from 'react-router-dom';

// Internal dependencies
import { getOptions } from '$src/utils/api';
import Button from '$src/components/Button/Button';
import { GameInformation, OptionItem, Options, Player } from '_packages/shared/src/types';
import SettingInput from './components/SettingInput/SettingInput';
import CopyIcon from '$src/assets/icons/copy.svg';
import PlayerCard from '$src/components/PlayerCard/PlayerCard';
import { PlayerStatus } from '_packages/shared/src/enums';
import style from './Lobby.module.css';

export default function Lobby({ game, socket }: { game: GameInformation; socket: Socket }): JSX.Element {
	const { user } = useAuth0();
	const navigate: NavigateFunction = useNavigate();

	const [options, setOptions] = useState<Options | undefined>(undefined);
	const [optionValues, setOptionValues] = useState<{
		region: string;
		category: string;
		tag: string;
		difficulty: string;
		questionTime: number;
		questionCount: number;
		isPrivate: boolean;
	}>({
		region: '',
		category: '',
		tag: '',
		difficulty: '',
		questionTime: 0,
		questionCount: 0,
		isPrivate: false
	});
	const [players, setPlayers] = useState<Player[]>([]);
	const [gamePin, setGamePin] = useState<string>('');
	const [host, setHost] = useState<boolean>(false);

	useEffect(() => {
		getOptions().then((options: Options) => setOptions(options));
	}, []);

	useEffect(() => {
		if (game) {
			setGamePin(game.id);
			setPlayers(game.players);
			//Check if any of the settings are different from the current settings
			if (
				game.settings.region !== optionValues.region ||
				game.settings.category !== optionValues.category ||
				game.settings.tag !== optionValues.tag ||
				game.settings.difficulty !== optionValues.difficulty ||
				game.settings.questionTime !== optionValues.questionTime ||
				game.settings.questionCount !== optionValues.questionCount ||
				game.settings.isPrivate !== optionValues.isPrivate
			)
				setOptionValues({
					region: game.settings.region || '',
					category: game.settings.category || '',
					tag: game.settings.tag || '',
					difficulty: game.settings.difficulty || '',
					questionTime: game.settings.questionTime || 0,
					questionCount: game.settings.questionCount || 0,
					isPrivate: game.settings.isPrivate || false
				});
			setHost(game.players.find((player: Player) => player.email === user?.email)?.status === PlayerStatus.HOST);
		}
	}, [game]);

	useEffect(() => {
		socket.emit('events', {
			event: 'changeSettings',
			gamePin: gamePin,
			settings: optionValues
		});
	}, [optionValues]);

	return (
		<div className={style.content}>
			<div>
				<h2 className={style.title}>Match Lobby</h2>
				<p className={style.gamePin}>
					Game PIN: <span className={style.gamePinValue}>{gamePin}</span>
					<button
						className={style.copyButton}
						onClick={async (): Promise<void> => {
							await navigator.clipboard.writeText(gamePin);
							toast.success('Copied to clipboard');
						}}
					>
						<CopyIcon />
					</button>
				</p>
			</div>
			<div className={style.mainContent}>
				<div className={style.settings}>
					<h3 className={style.subtitle}>Settings</h3>
					<div className={style.settingsContent}>
						<SettingInput
							label="Region"
							options={options?.regions}
							value={
								options?.regions[
									options?.regions.findIndex((region: OptionItem) => region.value === optionValues.region)
								]?.value
							}
							onChange={(value: { value: string; label: string } | undefined): void =>
								setOptionValues({ ...optionValues, region: value?.value || '' })
							}
							edit={host}
							inputType="select"
						/>
						<SettingInput
							label="Category"
							options={options?.categories}
							value={
								options?.categories[
									options?.categories.findIndex((category: OptionItem) => category.value === optionValues.category)
								]?.value
							}
							onChange={(value: { value: string; label: string } | undefined): void =>
								setOptionValues({ ...optionValues, category: value?.value || '' })
							}
							edit={host}
							inputType="select"
						/>
						<SettingInput
							label="Tag"
							options={options?.tags}
							value={options?.tags[options?.tags.findIndex((tag: OptionItem) => tag.value === optionValues.tag)]?.value}
							onChange={(value: { value: string; label: string } | undefined): void =>
								setOptionValues({ ...optionValues, tag: value?.value || '' })
							}
							edit={host}
							inputType="select"
						/>
						<SettingInput
							label="Difficulty"
							options={options?.difficulties}
							value={
								options?.difficulties[
									options?.difficulties.findIndex(
										(difficulty: OptionItem) => difficulty.value === optionValues.difficulty
									)
								]?.value
							}
							onChange={(value: { value: string; label: string } | undefined): void =>
								setOptionValues({ ...optionValues, difficulty: value?.value || '' })
							}
							edit={host}
							inputType="select"
						/>
						<SettingInput
							label="Time per question (seconds)"
							value={optionValues.questionTime.toString()}
							onChange={(value: { value: string; label: string } | undefined): void =>
								setOptionValues({ ...optionValues, questionTime: Number(value?.value) || 0 })
							}
							edit={host}
							inputType="number"
						/>
						<SettingInput
							label="Number of questions"
							value={optionValues.questionCount.toString()}
							onChange={(value: { value: string; label: string } | undefined): void =>
								setOptionValues({ ...optionValues, questionCount: Number(value?.value) || 0 })
							}
							edit={host}
							inputType="number"
						/>
						<SettingInput
							label="Private game"
							value={optionValues.isPrivate ? 'true' : 'false'}
							onChange={(value: { value: string; label: string } | undefined): void =>
								setOptionValues({ ...optionValues, isPrivate: value?.value === 'true' })
							}
							edit={host}
							inputType="checkbox"
						/>
					</div>
				</div>
				<div className={style.players}>
					<h3 className={style.subtitle}>Players</h3>
					{players.map((player: Player) => (
						<PlayerCard
							key={player.id}
							name={player.name}
							imageURL={player.imageURL}
							status={player.status}
							score={player.score}
							stage={'lobby'}
						/>
					))}
				</div>
			</div>
			{!host && (
				<p className={style.waiting}>
					Waiting for {game ? game.players.find((player: Player) => player.status === PlayerStatus.HOST)?.name : ''} to
					start the game...
				</p>
			)}
			<div className={style.buttons}>
				<Button
					text="BACK"
					onClick={(): void => {
						navigate('/');
					}}
					secondary
					small
				/>
				{host ? (
					<Button
						text="START GAME"
						onClick={(): void => {
							//View toast if not everyone is ready
							if (players.some((player: Player) => player.status === PlayerStatus.NOT_READY)) {
								toast.warning('Not everyone is ready!');
								return;
							}

							//Start game
							socket.emit('events', {
								gamePin: game?.id,
								event: 'startGame'
							});
						}}
						small
					/>
				) : (
					<Button
						text={
							game && game.players.find((player: Player) => player.email === user?.email)?.status === PlayerStatus.READY
								? 'NOT READY'
								: 'READY'
						}
						onClick={(): void => {
							if (!game) return;
							socket.emit('events', {
								gamePin: game.id,
								event: 'changePlayerStatus',
								status:
									game.players.find((player: Player) => player.email === user?.email)?.status === PlayerStatus.READY
										? PlayerStatus.NOT_READY
										: PlayerStatus.READY
							});
						}}
						small
					/>
				)}
			</div>
		</div>
	);
}
