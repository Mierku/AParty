export function sendMessagePromise(
	message: any
): Promise<{ success: boolean; [key: string]: unknown }> {
	return new Promise((resolve, reject) => {
		browser.runtime.sendMessage(message, function (response) {
			if (browser.runtime.lastError) {
				// 处理可能发生的错误，例如接收方不存在或出现内部错误
				reject(browser.runtime.lastError);
			} else {
				resolve(response);
			}
		});
	});
}
