import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// 라우트 불러오기
import focusRouter from "./modules/focus.module.js";

// 환경변수 불러오기
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// API 라우팅

app.use("/studies", focusRouter);

// 서버 실행
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
