# CocoParty 视频同步插件前端接口文档

本文档描述了CocoParty视频同步插件的前端接口规范，包括WebSocket事件和REST API端点。

## 基础信息

- **WebSocket服务地址**: `ws://服务器地址:3000`
- **HTTP API地址**: `http://服务器地址:3000`

## 消息格式

所有WebSocket消息都遵循以下基本格式：

```typescript
interface BaseMessage {
  type: string; // 消息类型
  roomId: string; // 房间ID
  senderId: string; // 发送者ID
  data?: any; // 消息数据（可选）
  timestamp: number; // 时间戳（毫秒）
}
```

## WebSocket事件

### 连接与断开

客户端需要连接到WebSocket服务，连接成功后可以开始收发消息。

```javascript
// 使用Socket.IO客户端连接服务器
const socket = io('http://服务器地址:3000');

// 连接成功事件
socket.on('connect', () => {
  console.log('已连接到服务器，Socket ID:', socket.id);
});

// 连接断开事件
socket.on('disconnect', () => {
  console.log('与服务器断开连接');
});
```

### 服务器主动发送的事件

以下是服务器可能主动发送给客户端的事件：

#### 1. 房间信息更新 (ROOM_INFO)

当房间信息发生变化时（如有人加入/离开、控制模式改变等），服务器会向房间内所有成员广播房间信息。

**事件格式**:

```javascript
{
  type: 'ROOM_INFO',
  roomId: 'room_123',       // 房间ID
  senderId: 'server',       // 发送者ID，服务器发送时为'server'
  data: {
    roomId: 'room_123',     // 房间ID
    host: 'user_456',       // 房主ID
    url: 'https://example.com/video', // 视频URL
    site: 'example.com',    // 视频网站
    controlMode: 'HOST_ONLY', // 控制模式
    participants: ['user_456', 'user_789'], // 参与者列表
    currentTime: 120.5,     // 当前播放时间（秒）
    isPlaying: true,        // 是否正在播放
    createdAt: '2023-07-01T12:00:00Z', // 创建时间
    updatedAt: '2023-07-01T12:10:00Z'  // 更新时间
  },
  timestamp: 1687654321000
}
```

**处理方式**:

```javascript
socket.on('ROOM_INFO', (message) => {
  console.log('收到房间信息更新:', message.data);

  // 更新UI显示的房间信息
  updateRoomUI(message.data);

  // 更新参与者列表
  updateParticipantsList(message.data.participants);

  // 更新房间控制模式显示
  updateControlModeDisplay(message.data.controlMode);
});
```

#### 2. 重定向到视频 (REDIRECT)

当用户加入房间时，服务器会发送重定向消息，指示客户端应该跳转到哪个视频URL。

**事件格式**:

```javascript
{
  type: 'REDIRECT',
  roomId: 'room_123',     // 房间ID
  senderId: 'server',     // 发送者ID，服务器发送时为'server'
  data: {
    url: 'https://example.com/video' // 目标视频URL
  },
  timestamp: 1687654321000
}
```

**处理方式**:

```javascript
socket.on('REDIRECT', (message) => {
  console.log('需要重定向到:', message.data.url);

  // 与当前URL比较，如果不同则进行跳转
  const currentUrl = window.location.href;
  if (currentUrl !== message.data.url) {
    // 可以显示确认对话框
    if (confirm('需要跳转到房间正在观看的视频吗？')) {
      window.location.href = message.data.url;
    }
  }
});
```

#### 3. 用户加入通知 (USER_JOIN)

当新用户加入房间时，服务器会向房间内的其他用户发送通知。

**事件格式**:

```javascript
{
  type: 'USER_JOIN',
  roomId: 'room_123',     // 房间ID
  senderId: 'server',     // 发送者ID，服务器发送时为'server'
  data: {
    userId: 'user_789'    // 加入的用户ID
  },
  timestamp: 1687654321000
}
```

**处理方式**:

```javascript
socket.on('USER_JOIN', (message) => {
  console.log('新用户加入:', message.data.userId);

  // 显示用户加入通知
  showNotification(`用户 ${message.data.userId} 加入了房间`);

  // 注意：完整的参与者列表会通过ROOM_INFO事件更新
});
```

#### 4. 用户离开通知 (USER_LEAVE)

当用户离开房间时，服务器会向房间内的其他用户发送通知。

**事件格式**:

```javascript
{
  type: 'USER_LEAVE',
  roomId: 'room_123',     // 房间ID
  senderId: 'server',     // 发送者ID，服务器发送时为'server'
  data: {
    userId: 'user_789'    // 离开的用户ID
  },
  timestamp: 1687654321000
}
```

**处理方式**:

```javascript
socket.on('USER_LEAVE', (message) => {
  console.log('用户离开:', message.data.userId);

  // 显示用户离开通知
  showNotification(`用户 ${message.data.userId} 离开了房间`);

  // 注意：完整的参与者列表会通过ROOM_INFO事件更新
});
```

### 房间管理事件

#### 1. 创建房间 (CREATE_ROOM)

**发送消息**:

```javascript
socket.emit(
  'CREATE_ROOM',
  {
    type: 'CREATE_ROOM',
    roomId: 'room_123', // 客户端生成的房间ID
    senderId: 'user_456', // 创建者用户ID
    data: {
      roomId: 'room_123', // 房间ID
      url: 'https://example.com/video', // 视频URL
      site: 'example.com', // 视频网站
      controlMode: 'HOST_ONLY', // 控制模式: 'HOST_ONLY' 或 'ALL'
    },
    timestamp: Date.now(),
  },
  (response) => {
    // 响应回调
    if (response.success) {
      console.log('房间创建成功:', response.room);
    } else {
      console.error('房间创建失败:', response.error);
    }
  },
);
```

**验证规则**:

- `roomId`: 必须是字符串
- `url`: 必须是字符串
- `site`: 必须是字符串
- `controlMode`: 必须是 'HOST_ONLY' 或 'ALL'

#### 2. 加入房间 (JOIN_ROOM)

**发送消息**:

```javascript
socket.emit(
  'JOIN_ROOM',
  {
    type: 'JOIN_ROOM',
    roomId: 'room_123', // 要加入的房间ID
    senderId: 'user_789', // 加入者用户ID
    timestamp: Date.now(),
  },
  (response) => {
    // 响应回调
    if (response.success) {
      console.log('成功加入房间:', response.room);
    } else {
      console.error('加入房间失败:', response.error);
    }
  },
);
```

**接收消息**:

加入房间成功后，客户端将收到以下事件：

1. `ROOM_INFO` - 房间完整信息

```javascript
socket.on('ROOM_INFO', (message) => {
  console.log('收到房间信息:', message.data);
  // 根据房间信息更新UI
});
```

2. `REDIRECT` - 重定向到视频页面

```javascript
socket.on('REDIRECT', (message) => {
  console.log('需要重定向到:', message.data.url);
  // 跳转到指定的视频URL
});
```

3. `USER_JOIN` - 通知其他用户有新用户加入

```javascript
socket.on('USER_JOIN', (message) => {
  console.log('新用户加入:', message.data.userId);
  // 更新用户列表UI
});
```

#### 3. 离开房间 (LEAVE_ROOM)

**发送消息**:

```javascript
socket.emit(
  'LEAVE_ROOM',
  {
    type: 'LEAVE_ROOM',
    roomId: 'room_123', // 房间ID
    senderId: 'user_789', // 离开者用户ID
    timestamp: Date.now(),
  },
  (response) => {
    // 响应回调
    if (response.success) {
      console.log('成功离开房间');
    } else {
      console.error('离开房间失败:', response.error);
    }
  },
);
```

**接收消息**:

当用户离开房间后，其他用户将收到 `ROOM_INFO` 事件，包含更新后的房间信息。

### 视频控制事件

#### 1. 播放视频 (PLAY)

**发送消息**:

```javascript
socket.emit(
  'PLAY',
  {
    type: 'PLAY',
    roomId: 'room_123', // 房间ID
    senderId: 'user_456', // 发送者用户ID
    timestamp: Date.now(),
  },
  (response) => {
    if (response.success) {
      console.log('播放命令已发送');
    } else {
      console.error('播放命令发送失败:', response.error);
    }
  },
);
```

**接收消息**:

```javascript
socket.on('PLAY', (message) => {
  console.log('收到播放命令:', message);
  // 播放视频
  videoPlayer.play();
});
```

#### 2. 暂停视频 (PAUSE)

**发送消息**:

```javascript
socket.emit(
  'PAUSE',
  {
    type: 'PAUSE',
    roomId: 'room_123', // 房间ID
    senderId: 'user_456', // 发送者用户ID
    timestamp: Date.now(),
  },
  (response) => {
    if (response.success) {
      console.log('暂停命令已发送');
    } else {
      console.error('暂停命令发送失败:', response.error);
    }
  },
);
```

**接收消息**:

```javascript
socket.on('PAUSE', (message) => {
  console.log('收到暂停命令:', message);
  // 暂停视频
  videoPlayer.pause();
});
```

#### 3. 跳转到指定时间 (SEEK)

**发送消息**:

```javascript
socket.emit(
  'SEEK',
  {
    type: 'SEEK',
    roomId: 'room_123', // 房间ID
    senderId: 'user_456', // 发送者用户ID
    data: {
      time: 120.5, // 目标时间（秒）
    },
    timestamp: Date.now(),
  },
  (response) => {
    if (response.success) {
      console.log('跳转命令已发送');
    } else {
      console.error('跳转命令发送失败:', response.error);
    }
  },
);
```

**接收消息**:

```javascript
socket.on('SEEK', (message) => {
  console.log('收到跳转命令:', message.data.time);
  // 跳转到指定时间
  videoPlayer.currentTime = message.data.time;
});
```

#### 4. 同步视频状态 (SYNC_VIDEO)

**发送消息**:

```javascript
socket.emit(
  'SYNC_VIDEO',
  {
    type: 'SYNC_VIDEO',
    roomId: 'room_123', // 房间ID
    senderId: 'user_456', // 发送者用户ID
    data: {
      currentTime: 120.5, // 当前时间（秒）
      isPlaying: true, // 是否正在播放
    },
    timestamp: Date.now(),
  },
  (response) => {
    if (response.success) {
      console.log('同步状态已发送');
    } else {
      console.error('同步状态发送失败:', response.error);
    }
  },
);
```

**接收消息**:

```javascript
socket.on('SYNC_VIDEO', (message) => {
  console.log('收到同步状态:', message.data);

  // 同步视频状态
  videoPlayer.currentTime = message.data.currentTime;

  if (message.data.isPlaying) {
    videoPlayer.play();
  } else {
    videoPlayer.pause();
  }
});
```

#### 5. 更改控制模式 (CONTROL_MODE_CHANGE)

**发送消息**:

```javascript
socket.emit(
  'CONTROL_MODE_CHANGE',
  {
    type: 'CONTROL_MODE_CHANGE',
    roomId: 'room_123', // 房间ID
    senderId: 'user_456', // 发送者用户ID（必须是房主）
    data: {
      controlMode: 'ALL', // 新的控制模式: 'HOST_ONLY' 或 'ALL'
    },
    timestamp: Date.now(),
  },
  (response) => {
    if (response.success) {
      console.log('控制模式已更改');
    } else {
      console.error('控制模式更改失败:', response.error);
    }
  },
);
```

**接收消息**:

控制模式更改后，所有客户端将收到 `ROOM_INFO` 事件，包含更新后的房间信息。

## REST API端点

### 1. 获取房间列表 GET /api/rooms

**请求**:

```
GET /api/rooms
```

**响应**:

```json
{
  "rooms": [
    {
      "roomId": "room_123",
      "host": "user_456",
      "participants": ["user_456", "user_789"],
      "site": "example.com",
      "createdAt": "2023-07-01T12:00:00Z",
      "updatedAt": "2023-07-01T12:10:00Z"
    }
    // 更多房间...
  ]
}
```

### 2. 获取房间详情 GET /api/rooms/:roomId

**请求**:

```
GET /api/rooms/room_123
```

**响应**:

```json
{
  "roomId": "room_123",
  "host": "user_456",
  "url": "https://example.com/video",
  "site": "example.com",
  "controlMode": "HOST_ONLY",
  "participants": ["user_456", "user_789"],
  "currentTime": 120.5,
  "isPlaying": true,
  "createdAt": "2023-07-01T12:00:00Z",
  "updatedAt": "2023-07-01T12:10:00Z"
}
```

## 错误处理

所有WebSocket消息都会返回以下格式的响应：

**成功响应**:

```json
{
  "success": true,
  "room": {
    /* 房间信息 */
  }
}
```

**错误响应**:

```json
{
  "success": false,
  "error": "错误信息"
}
```

### 常见错误

- `房间不存在`: 尝试加入不存在的房间
- `没有权限控制视频`: 在HOST_ONLY模式下非房主尝试控制视频
- `只有房主可以更改控制模式`: 非房主尝试更改控制模式

## 前端集成示例

### 1. 初始化连接

```javascript
// 初始化Socket.IO连接
const socket = io('http://服务器地址:3000');

// 连接成功后的处理
socket.on('connect', () => {
  console.log('已连接到服务器');

  // 可以在这里启用UI界面的交互功能
  enableControls();
});

// 处理断开连接
socket.on('disconnect', () => {
  console.log('与服务器断开连接');

  // 禁用UI界面的交互功能
  disableControls();
});
```

### 2. 创建或加入房间

```javascript
// 创建房间
function createRoom() {
  const roomId = generateRoomId(); // 生成随机房间ID
  const userId = getUserId(); // 获取用户ID
  const videoUrl = getCurrentUrl(); // 获取当前视频URL
  const siteDomain = extractDomain(videoUrl); // 提取域名

  socket.emit(
    'CREATE_ROOM',
    {
      type: 'CREATE_ROOM',
      roomId,
      senderId: userId,
      data: {
        roomId,
        url: videoUrl,
        site: siteDomain,
        controlMode: 'HOST_ONLY',
      },
      timestamp: Date.now(),
    },
    handleRoomResponse,
  );
}

// 加入房间
function joinRoom(roomId) {
  const userId = getUserId(); // 获取用户ID

  socket.emit(
    'JOIN_ROOM',
    {
      type: 'JOIN_ROOM',
      roomId,
      senderId: userId,
      timestamp: Date.now(),
    },
    handleRoomResponse,
  );
}

// 处理房间操作响应
function handleRoomResponse(response) {
  if (response.success) {
    showSuccessMessage('操作成功');
    updateRoomInfo(response.room);
  } else {
    showErrorMessage(response.error);
  }
}
```

### 3. 视频控制

```javascript
// 发送播放命令
function sendPlay() {
  if (!currentRoomId) return;

  socket.emit('PLAY', {
    type: 'PLAY',
    roomId: currentRoomId,
    senderId: getUserId(),
    timestamp: Date.now(),
  });
}

// 发送暂停命令
function sendPause() {
  if (!currentRoomId) return;

  socket.emit('PAUSE', {
    type: 'PAUSE',
    roomId: currentRoomId,
    senderId: getUserId(),
    timestamp: Date.now(),
  });
}

// 发送跳转命令
function sendSeek(timeInSeconds) {
  if (!currentRoomId) return;

  socket.emit('SEEK', {
    type: 'SEEK',
    roomId: currentRoomId,
    senderId: getUserId(),
    data: {
      time: timeInSeconds,
    },
    timestamp: Date.now(),
  });
}

// 注册视频控制事件监听
function setupVideoControlListeners() {
  socket.on('PLAY', handlePlayCommand);
  socket.on('PAUSE', handlePauseCommand);
  socket.on('SEEK', handleSeekCommand);
  socket.on('SYNC_VIDEO', handleSyncVideo);
}

// 处理播放命令
function handlePlayCommand(message) {
  videoPlayer.play();
}

// 处理暂停命令
function handlePauseCommand(message) {
  videoPlayer.pause();
}

// 处理跳转命令
function handleSeekCommand(message) {
  videoPlayer.currentTime = message.data.time;
}

// 处理同步视频
function handleSyncVideo(message) {
  const { currentTime, isPlaying } = message.data;

  // 如果时间差异较大，才进行跳转（避免微小差异导致的不断跳转）
  if (Math.abs(videoPlayer.currentTime - currentTime) > 3) {
    videoPlayer.currentTime = currentTime;
  }

  if (isPlaying && videoPlayer.paused) {
    videoPlayer.play();
  } else {
    videoPlayer.pause();
  }
}
```

### 4. 周期性同步

为了保持视频同步，客户端可以定期发送同步消息：

```javascript
// 开始定期同步
function startSyncInterval() {
  syncIntervalId = setInterval(() => {
    if (!currentRoomId) return;

    socket.emit('SYNC_VIDEO', {
      type: 'SYNC_VIDEO',
      roomId: currentRoomId,
      senderId: getUserId(),
      data: {
        currentTime: videoPlayer.currentTime,
        isPlaying: !videoPlayer.paused,
      },
      timestamp: Date.now(),
    });
  }, 10000); // 每10秒同步一次
}

// 停止同步
function stopSyncInterval() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}
```

## 安全注意事项

1. **数据验证**: 所有发送到服务器的数据都应该进行客户端验证，确保格式正确。

2. **错误处理**: 实现完善的错误处理机制，展示友好的错误消息给用户。

3. **重连机制**: 实现WebSocket断线重连机制，确保连接可靠性。

4. **操作频率限制**: 避免短时间内发送过多的控制指令，可以实现节流或防抖机制。

5. **用户身份**: 确保使用唯一且一致的用户ID，可以考虑实现简单的身份认证。

## 调试信息

开发过程中，可以启用调试模式查看WebSocket通信：

```javascript
// 启用Socket.IO客户端调试
localStorage.debug = 'socket.io-client:*';
```

## 高级特性和注意事项

### 1. 数据验证和错误处理

服务器使用`class-validator`和`class-transformer`库对所有WebSocket消息进行严格验证。前端需要注意：

1. **验证错误响应格式**:

```javascript
{
  "success": false,
  "error": "请求验证失败",
  "details": {
    "message": ["房间ID是必填项", "控制模式必须是'HOST_ONLY'或'ALL'"]
  }
}
```

2. **常见验证规则**:

   - 所有必填字段不能为空
   - `roomId`和`senderId`必须是字符串
   - `timestamp`必须是数字
   - `controlMode`必须是合法枚举值('HOST_ONLY'或'ALL')
   - 复杂对象（如data字段）会递归验证所有属性

3. **错误处理最佳实践**:

```javascript
function handleSocketError(error) {
  if (error.details && Array.isArray(error.details.message)) {
    // 显示详细的验证错误信息
    error.details.message.forEach((msg) => {
      showErrorMessage(msg);
    });
  } else {
    // 显示一般错误信息
    showErrorMessage(error.error || '发生未知错误');
  }

  // 根据错误类型执行不同的恢复操作
  if (error.error === '房间不存在') {
    // 可能房间已被删除，重定向到主页
    redirectToHomePage();
  }
}
```

### 2. 消息类型枚举

服务端定义了所有可能的消息类型枚举。前端应使用相同的枚举值以确保一致性：

```typescript
enum MessageType {
  CREATE_ROOM = 'CREATE_ROOM',
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  SEEK = 'SEEK',
  SYNC_VIDEO = 'SYNC_VIDEO',
  CONTROL_MODE_CHANGE = 'CONTROL_MODE_CHANGE',
  ROOM_INFO = 'ROOM_INFO',
  USER_JOIN = 'USER_JOIN',
  USER_LEAVE = 'USER_LEAVE',
  REDIRECT = 'REDIRECT',
}
```

使用这个枚举可以减少拼写错误并提高代码可维护性：

```javascript
// 使用枚举而不是字符串字面量
socket.emit(MessageType.PLAY, {
  type: MessageType.PLAY,
  roomId: currentRoomId,
  senderId: getUserId(),
  timestamp: Date.now(),
});
```

### 3. 房主更换逻辑

当房主离开房间时，服务器会自动将第一个剩余参与者设为新房主。前端需要处理这种情况：

```javascript
// 跟踪当前房主
let currentHost = null;

// 监听房间信息更新
socket.on('ROOM_INFO', (message) => {
  // 检查房主是否发生变化
  if (currentHost !== message.data.host) {
    // 房主已更改
    if (message.data.host === getUserId()) {
      // 当前用户成为新房主
      showNotification('你已成为房间的新房主');
      enableHostControls(); // 启用房主特有的控制功能
    } else if (currentHost === getUserId()) {
      // 当前用户不再是房主
      disableHostControls(); // 禁用房主特有的控制功能
    }

    // 更新UI显示
    updateHostDisplay(message.data.host);
  }

  // 更新当前房主引用
  currentHost = message.data.host;

  // 更新其他房间信息...
});
```

### 4. 房间生命周期

房间具有以下生命周期特征，前端应相应处理：

1. **创建**：房间在第一个用户创建时立即可用
2. **持续**：只要至少有一个参与者，房间就会持续存在
3. **删除**：当最后一个参与者离开时，房间会被自动删除

房间生命周期事件处理示例：

```javascript
// 处理可能的房间不存在情况
function joinRoom(roomId) {
  socket.emit(
    'JOIN_ROOM',
    {
      type: 'JOIN_ROOM',
      roomId,
      senderId: getUserId(),
      timestamp: Date.now(),
    },
    (response) => {
      if (!response.success && response.error === '房间不存在') {
        showErrorMessage('你尝试加入的房间不存在或已被删除');
        redirectToHomePage();
      }
    },
  );
}

// 作为最后一个用户离开房间
function leaveRoomAsLastUser() {
  showConfirmation(
    '你是最后一个用户，离开将导致房间被删除。确定要离开吗？',
    () => {
      socket.emit('LEAVE_ROOM', {
        type: 'LEAVE_ROOM',
        roomId: currentRoomId,
        senderId: getUserId(),
        timestamp: Date.now(),
      });

      currentRoomId = null;
      redirectToHomePage();
    },
  );
}
```

### 5. 高级错误处理与连接恢复

WebSocket连接可能因网络问题而断开。实现自动重连和会话恢复机制：

```javascript
// 存储当前房间ID以便断线重连
let currentRoomId = null;

// 设置自动重连逻辑
socket.on('connect', () => {
  console.log('已连接到服务器');

  // 如果之前在某个房间中，尝试重新加入
  if (currentRoomId) {
    socket.emit(
      'JOIN_ROOM',
      {
        type: 'JOIN_ROOM',
        roomId: currentRoomId,
        senderId: getUserId(),
        timestamp: Date.now(),
      },
      (response) => {
        if (response.success) {
          showNotification('已重新连接到房间');
        } else {
          // 房间可能已不存在
          showErrorMessage('无法重新加入之前的房间：' + response.error);
          currentRoomId = null;
          redirectToHomePage();
        }
      },
    );
  }
});

// 处理断开连接
socket.on('disconnect', () => {
  console.log('与服务器断开连接');
  showWarning('与服务器的连接已断开，正在尝试重新连接...');

  // Socket.IO会自动尝试重连
});

// 跟踪重连尝试
socket.on('reconnect_attempt', (attemptNumber) => {
  showWarning(`正在尝试重新连接 (${attemptNumber})...`);
});

// 重连失败
socket.on('reconnect_failed', () => {
  showError('无法重新连接到服务器。请刷新页面重试。');
});
```

### 6. 视频同步优化

为了处理网络延迟和确保更平滑的观看体验，可以实现以下优化：

```javascript
// 智能视频同步处理
function handleSyncVideo(message) {
  const { currentTime, isPlaying } = message.data;
  const currentPlayerTime = videoPlayer.currentTime;

  // 计算时间差异
  const timeDifference = Math.abs(currentPlayerTime - currentTime);

  // 根据时间差异采取不同的同步策略
  if (timeDifference > 5) {
    // 差异较大，直接跳转
    videoPlayer.currentTime = currentTime;
  } else if (timeDifference > 1) {
    // 中等差异，使用渐进式调整
    // 临时加快或减慢播放速度
    videoPlayer.playbackRate = currentPlayerTime < currentTime ? 1.1 : 0.9;

    // 2秒后恢复正常播放速度
    setTimeout(() => {
      videoPlayer.playbackRate = 1.0;
    }, 2000);
  }

  // 同步播放状态
  if (isPlaying && videoPlayer.paused) {
    videoPlayer.play().catch((error) => console.error('播放失败:', error));
  } else if (!isPlaying && !videoPlayer.paused) {
    videoPlayer.pause();
  }
}

// 使用节流减少同步请求频率
function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function () {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(
        function () {
          if (Date.now() - lastRan >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        },
        limit - (Date.now() - lastRan),
      );
    }
  };
}

// 应用节流到同步函数
const throttledSyncVideo = throttle(function () {
  if (!currentRoomId) return;

  socket.emit('SYNC_VIDEO', {
    type: 'SYNC_VIDEO',
    roomId: currentRoomId,
    senderId: getUserId(),
    data: {
      currentTime: videoPlayer.currentTime,
      isPlaying: !videoPlayer.paused,
    },
    timestamp: Date.now(),
  });
}, 2000); // 限制为至少2秒一次
```

## 浏览器兼容性

CocoParty视频同步插件基于WebSocket和现代JavaScript特性，建议使用以下浏览器以获得最佳体验：

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 15+

注意：在某些网站上，视频播放控制可能受到跨域限制。插件可能需要通过浏览器扩展方式实现以获得必要的权限。
