import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/db.config.js';
import { User } from '../models/User.js';
import logger from '../utils/logger.js';

let io: Server;

export const initSocket = (server: HttpServer) => {
    io = new Server(server, {
        cors: {
            origin: '*', // Adjust based on your CORS settings
            methods: ['GET', 'POST']
        }
    });

    // Authentication Middleware for Sockets
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error: Token missing'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({ where: { id: decoded.userId } });

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            if (user.is_banned) {
                return next(new Error('Authentication error: User is banned'));
            }

            // Attach user to socket
            (socket as any).user = user;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const user = (socket as any).user as User;
        logger.info(`🔌 Socket connected: ${socket.id} (User: ${user.email})`);

        // Join user to their own room for targeted notifications
        socket.join(user.id);

        socket.on('disconnect', () => {
            logger.info(`🔌 Socket disconnected: ${socket.id}`);
        });

        // Handle other events here
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
