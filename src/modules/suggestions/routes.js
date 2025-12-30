import express from 'express';
import { getSuggestions } from './controller.js';

const router = express.Router();

router.get('/', getSuggestions);

export default router;
