import { Router } from 'express';
import {
	askAssistant,
	createChat,
	getChats,
	getChatMessages,
	renameChat,
	deleteChat,
	sendChatMessage,
	editAndResendChatMessage,
} from '../../controllers/v1/ai.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import {
	aiAskSchema,
	aiCreateChatSchema,
	aiRenameChatSchema,
	aiChatMessageSchema,
} from '../../validators/v1/ai.validator.js';
import { aiAssistantLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/chats', getChats);
router.post('/chats', validateRequest(aiCreateChatSchema), createChat);
router.get('/chats/:chatId/messages', getChatMessages);
router.patch('/chats/:chatId', validateRequest(aiRenameChatSchema), renameChat);
router.delete('/chats/:chatId', deleteChat);
router.post('/chats/:chatId/messages', aiAssistantLimiter, validateRequest(aiChatMessageSchema), sendChatMessage);
router.post('/chats/:chatId/messages/:messageId/resend', aiAssistantLimiter, validateRequest(aiChatMessageSchema), editAndResendChatMessage);

// POST /api/v1/ai/ask
router.post('/ask', aiAssistantLimiter, validateRequest(aiAskSchema), askAssistant);

export default router;
