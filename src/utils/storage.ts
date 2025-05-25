import { RoomInfo } from "./constants";

// 生成随机用户ID
export const generateUserId = (): string => {
	return (
		Math.random().toString(36).substring(2, 15) +
		Math.random().toString(36).substring(2, 15)
	);
};

// 生成随机房间ID
export const generateRoomId = (): string => {
	return Math.random().toString(36).substring(2, 10);
};

// 存储键
const KEYS = {
	USER_ID: "cocoparty_user_id",
	CURRENT_ROOM: "cocoparty_current_room",
	ROOM_DATA: "cocoparty_room_data_",
};

// 获取用户ID（如果不存在则创建）
export const getUserId = async (): Promise<string> => {
	const result = await browser.storage.local.get(KEYS.USER_ID);
	let userId = result[KEYS.USER_ID];

	if (!userId) {
		userId = generateUserId();
		await browser.storage.local.set({ [KEYS.USER_ID]: userId });
	}

	return userId;
};

// 保存当前房间ID
export const saveCurrentRoom = async (roomId: string): Promise<void> => {
	await browser.storage.local.set({ [KEYS.CURRENT_ROOM]: roomId });
};

// 获取当前房间ID
export const getCurrentRoom = async (): Promise<string | null> => {
	const result = await browser.storage.local.get(KEYS.CURRENT_ROOM);
	return result[KEYS.CURRENT_ROOM] || null;
};

// 保存房间信息
export const saveRoomInfo = async (roomInfo: RoomInfo): Promise<void> => {
	await browser.storage.local.set({
		[KEYS.ROOM_DATA + roomInfo.roomId]: roomInfo,
	});
};

// 获取房间信息
export const getRoomInfo = async (roomId: string): Promise<RoomInfo | null> => {
	const result = await browser.storage.local.get(KEYS.ROOM_DATA + roomId);
	return result[KEYS.ROOM_DATA + roomId] || null;
};

// 清除房间信息
export const clearRoomInfo = async (roomId: string): Promise<void> => {
	await browser.storage.local.remove(KEYS.ROOM_DATA + roomId);
};

// 清除当前房间
export const clearCurrentRoom = async (): Promise<void> => {
	await browser.storage.local.remove(KEYS.CURRENT_ROOM);
};
