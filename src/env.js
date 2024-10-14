let env;
const getEnv = () => {
	if (env) {
		return env;
	}
	throw new Error('Env is not set');
};
const setEnv = (env) => {
	if (env) {
		return env;
	}
	throw new Error('Env is not set');
};

export { getEnv, setEnv };
