export async function withSourceRetry(action, {attempts=3,pauseMs=2000,onRetry=()=>{}}={}) {
  for(let attempt=1;attempt<=attempts;attempt++) {
    try {return await action();}
    catch(error) {
      const transient=error.name==='TimeoutError'||error.code==='SOURCE_EMPTY'||/net::ERR_|Execution context was destroyed/.test(error.message);
      if(!transient||attempt===attempts) throw error;
      onRetry(error,attempt);
      await new Promise(resolve=>setTimeout(resolve,pauseMs));
    }
  }
}
