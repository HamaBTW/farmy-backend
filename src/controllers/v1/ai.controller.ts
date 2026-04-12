import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { ValidationRequest } from '../../middlewares/validation.middleware.js';
import { aiService, AiAssistantError, AssistantContext } from '../../services/v1/ai.service.js';

interface AskAssistantBody {
    message: string;
    context?: AssistantContext;
}

interface CreateChatBody {
    title?: string;
}

interface RenameChatBody {
    title: string;
}

interface SendChatMessageBody {
    message: string;
}

const parseLimit = (value: unknown, fallback: number, max: number): number => {
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
            return Math.min(Math.floor(parsed), max);
        }
    }

    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.min(Math.floor(value), max);
    }

    return fallback;
};

const userIdOrThrow = (req: AuthRequest): string => {
    const userId = req.user?.id;
    if (!userId) {
        throw new AiAssistantError(401, 'AUTH_REQUIRED', 'Authentication required.');
    }
    return userId;
};

export const askAssistant = async (
    req: AuthRequest & ValidationRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const body = (req.validatedData || req.body) as AskAssistantBody;
        const result = await aiService.askAssistant(body.message, body.context || {}, req.user?.id);

        res.status(200).json({
            success: true,
            data: {
                reply: result.reply,
                language: result.language,
                meta: {
                    model: result.model,
                    responseMs: result.responseMs,
                    timestamp: new Date().toISOString(),
                },
            },
        });
    } catch (error) {
        if (error instanceof AiAssistantError) {
            res.status(error.statusCode).json({
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                },
            });
            return;
        }

        next(error);
    }
};

export const createChat = async (
    req: AuthRequest & ValidationRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = userIdOrThrow(req);
        const body = (req.validatedData || req.body) as CreateChatBody;
        const chat = await aiService.createChat(userId, body.title);

        res.status(201).json({
            success: true,
            data: { chat },
        });
    } catch (error) {
        if (error instanceof AiAssistantError) {
            res.status(error.statusCode).json({
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                },
            });
            return;
        }

        next(error);
    }
};

export const getChats = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = userIdOrThrow(req);
        const limit = parseLimit(req.query.limit, 30, 100);
        const chats = await aiService.listChats(userId, limit);

        res.status(200).json({
            success: true,
            data: { chats },
        });
    } catch (error) {
        if (error instanceof AiAssistantError) {
            res.status(error.statusCode).json({
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                },
            });
            return;
        }

        next(error);
    }
};

export const getChatMessages = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = userIdOrThrow(req);
        const chatId = String(req.params.chatId || '').trim();
        if (!chatId) {
            throw new AiAssistantError(400, 'CHAT_ID_REQUIRED', 'Chat ID is required.');
        }

        const limit = parseLimit(req.query.limit, 250, 500);
        const messages = await aiService.getChatMessages(userId, chatId, limit);

        res.status(200).json({
            success: true,
            data: {
                chatId,
                messages,
            },
        });
    } catch (error) {
        if (error instanceof AiAssistantError) {
            res.status(error.statusCode).json({
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                },
            });
            return;
        }

        next(error);
    }
};

export const renameChat = async (
    req: AuthRequest & ValidationRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = userIdOrThrow(req);
        const chatId = String(req.params.chatId || '').trim();
        if (!chatId) {
            throw new AiAssistantError(400, 'CHAT_ID_REQUIRED', 'Chat ID is required.');
        }

        const body = (req.validatedData || req.body) as RenameChatBody;
        const chat = await aiService.renameChat(userId, chatId, body.title);

        res.status(200).json({
            success: true,
            data: { chat },
        });
    } catch (error) {
        if (error instanceof AiAssistantError) {
            res.status(error.statusCode).json({
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                },
            });
            return;
        }

        next(error);
    }
};

export const deleteChat = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = userIdOrThrow(req);
        const chatId = String(req.params.chatId || '').trim();
        if (!chatId) {
            throw new AiAssistantError(400, 'CHAT_ID_REQUIRED', 'Chat ID is required.');
        }

        await aiService.deleteChat(userId, chatId);
        res.status(200).json({
            success: true,
            data: {
                chatId,
            },
        });
    } catch (error) {
        if (error instanceof AiAssistantError) {
            res.status(error.statusCode).json({
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                },
            });
            return;
        }

        next(error);
    }
};

export const sendChatMessage = async (
    req: AuthRequest & ValidationRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = userIdOrThrow(req);
        const chatId = String(req.params.chatId || '').trim();
        if (!chatId) {
            throw new AiAssistantError(400, 'CHAT_ID_REQUIRED', 'Chat ID is required.');
        }

        const body = (req.validatedData || req.body) as SendChatMessageBody;
        const data = await aiService.sendMessageToChat(userId, chatId, body.message);

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        if (error instanceof AiAssistantError) {
            res.status(error.statusCode).json({
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                },
            });
            return;
        }

        next(error);
    }
};

export const editAndResendChatMessage = async (
    req: AuthRequest & ValidationRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = userIdOrThrow(req);
        const chatId = String(req.params.chatId || '').trim();
        const messageId = String(req.params.messageId || '').trim();

        if (!chatId) {
            throw new AiAssistantError(400, 'CHAT_ID_REQUIRED', 'Chat ID is required.');
        }

        if (!messageId) {
            throw new AiAssistantError(400, 'MESSAGE_ID_REQUIRED', 'Message ID is required.');
        }

        const body = (req.validatedData || req.body) as SendChatMessageBody;
        const data = await aiService.editAndResendMessage(userId, chatId, messageId, body.message);

        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        if (error instanceof AiAssistantError) {
            res.status(error.statusCode).json({
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                },
            });
            return;
        }

        next(error);
    }
};
