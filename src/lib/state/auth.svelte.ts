class AuthState {
	apiKey = $state<string>('');
	isOpenModal = $state<boolean>(false);

	constructor() {
		if (typeof window !== 'undefined') {
			this.apiKey = localStorage.getItem('tmdb_api_key') || '';
			if (!this.apiKey) {
				this.isOpenModal = true;
			}
		}
	}

	setApiKey(key: string) {
		this.apiKey = key.trim();
		if (typeof window !== 'undefined') {
			localStorage.setItem('tmdb_api_key', this.apiKey);
		}
	}

	clearApiKey() {
		this.apiKey = '';
		if (typeof window !== 'undefined') {
			localStorage.removeItem('tmdb_api_key');
		}
		this.isOpenModal = true;
	}

	get hasKey() {
		return Boolean(this.apiKey);
	}
}

export const auth = new AuthState();