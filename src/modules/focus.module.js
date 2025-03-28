import express from "express";
import { PrismaClient } from "@prisma/client";
import { confirmStudyPassword } from "./study.module.js"; //dev 에 merge후 경로 추가예정

const prisma = new PrismaClient();
const focusRouter = express.Router();

focusRouter.post("/:id/focus/auth", async (req, res, next) => {
  const id = Number(req.params.id);
  const { password } = req.body;

  try {
    // 함수로 비밀번호 확인
    await confirmStudyPassword(id, password);

    // 비밀번호 인증 성공 → 집중 정보 반환
    const study = await prisma.study.findUnique({
      where: { id },
      select: {
        id: true,
        focusStartTime: true,
        focusTargetTime: true,
        totalPoints: true,
      },
    });

    if (!study) {
      return res.status(404).json({ message: "스터디가 존재하지 않습니다." });
    }

    res.status(200).json(study);
  } catch (e) {
    next(e);
  }
});
/**
 * 포인트 계산 함수
 * - 목표시간 도달 시 3점
 * - 이후 초과 10분마다 1점씩 추가
 */
function calculateFocusPoints(diffInSeconds) {
  if (diffInSeconds >= 0) return 0;

  const diffInMinutes = Math.floor(Math.abs(diffInSeconds) / 60);
  if (diffInMinutes < 10) return 3;

  return 3 + Math.floor(diffInMinutes / 10); // 10분당 1점 추가
}

/**
 * 오늘의 집중 시작
 */
focusRouter.post("/:id/focus", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetTime } = req.body;

    if (!targetTime || targetTime <= 0) {
      return res.status(403).json({ error: "올바르지 않은 집중 시간입니다." });
    }

    await prisma.study.update({
      where: { id: Number(id) },
      data: {
        focusStartTime: new Date(),
        focusTargetTime: targetTime,
      },
    });

    res.status(201).json({ message: "집중이 시작되었습니다." });
  } catch (error) {
    next(error);
  }
});

/**
 * 오늘의 집중 종료
 */
focusRouter.put("/:id/focus", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { elapsedTime } = req.body;

    const focusStudy = await prisma.study.findUnique({
      where: { id: Number(id) },
    });

    if (
      !focusStudy ||
      !focusStudy.focusStartTime ||
      focusStudy.focusTargetTime === null
    ) {
      return res
        .status(403)
        .json({ error: "요청한 작업을 수행하기 위한 권한이 없습니다." });
    }

    const { focusTargetTime, totalPoints } = focusStudy;
    const timeDifference = focusTargetTime - elapsedTime; // 초 단위

    const focusPoints = calculateFocusPoints(timeDifference);

    const updatedStudy = await prisma.study.update({
      where: { id: parseInt(id) },
      data: {
        totalPoints: totalPoints + focusPoints,
        focusStartTime: null,
        focusTargetTime: null,
      },
    });

    res
      .status(200)
      .json({ focusPoints, totalPoints: updatedStudy.totalPoints });
  } catch (error) {
    next(error);
  }
});

export default focusRouter;
