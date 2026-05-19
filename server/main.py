from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Body
from typing import Annotated
from AttendanceAi import AttendanceAI
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from models.models import Student, Teacher, Subject, Enrollment, AttendanceRecord
from sqlalchemy.orm import Session
from utils.db import Base, engine, get_db
from utils.auth import (
    create_access_token,
    create_access_token_for_user,
    decode_access_token,
    extract_access_token,
)

from fastapi import Depends
from fastapi import Response, Request
from fastapi.responses import JSONResponse
import traceback
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from collections import defaultdict
from datetime import datetime, timezone
import re

load_dotenv()

# Read client URL from environment (default to Vite dev server)
CLIENT_URL = os.getenv("CLIENT_URL", "http://localhost:5173")

STUDENT_ID_PATTERN = re.compile(r"^STD-\d+$")
TEACHER_USERNAME_PATTERN = re.compile(r"^TCH-\d+$")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CLIENT_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
attendance_ai = AttendanceAI()
Base.metadata.create_all(bind=engine)



FACE_MATCH_THRESHOLD = 0.35


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60,
        path="/",
    )


def build_auth_payload(student: Student) -> dict:
    token = create_access_token(student_id=student.studentId, full_name=student.fullName)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "student",
        "student_id": student.studentId,
        "full_name": student.fullName,
    }


def build_teacher_auth_payload(teacher: Teacher) -> dict:
    token = create_access_token_for_user(
        subject=teacher.username,
        full_name=teacher.fullName,
        role="teacher",
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "teacher",
        "username": teacher.username,
        "full_name": teacher.fullName,
    }


@app.post("/student/register")
async def register_student(
    response: Response,
    studentId: str = Form(),
    fullName: str = Form(),
    password: str = Form(),
    image: UploadFile = File(),
    db: Session = Depends(get_db),
):
    if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only image files allowed")

    if not STUDENT_ID_PATTERN.match(studentId):
        raise HTTPException(status_code=400, detail="Student ID must match STD-<number>, for example STD-001")

    try:
        image_bytes = await image.read()
        embedding = attendance_ai.single_face_embedding_extraction(
            image_bytes=image_bytes
        )
        existing_student = db.query(Student).filter(Student.studentId == studentId).first()

        if existing_student:
            raise HTTPException(status_code=400, detail="Student already exists")

        query_embedding = embedding.tolist()
        distance = Student.embedding.cosine_distance(query_embedding).label("distance")
        statement = select(Student, distance).order_by(distance).limit(1)
        result = db.execute(statement).first()

        if result:
            matched_student, best_distance = result
            if best_distance is not None and float(best_distance) <= FACE_MATCH_THRESHOLD:
                raise HTTPException(
                    status_code=400,
                    detail=f"This face is already registered to student {matched_student.studentId}",
                )

        student = Student(
            studentId=studentId,
            fullName=fullName,
            password=password,
            embedding=query_embedding,
        )

        db.add(student)

        db.commit()

        db.refresh(student)

        auth_payload = build_auth_payload(student)
        set_auth_cookie(response, auth_payload["access_token"])

        return {"message": "Student registered successfully", **auth_payload}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e) if str(e) else "unable to register student",
        )


@app.post("/student/login")
async def login_student(
    response: Response,
    studentId: str = Body(...),
    password: str = Body(...),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.studentId == studentId).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.password != password:
        raise HTTPException(status_code=401, detail="Invalid password")

    auth_payload = build_auth_payload(student)
    if response is not None:
        set_auth_cookie(response, auth_payload["access_token"])

    return {"message": "Login successful", **auth_payload}


@app.post("/teacher/register")
async def register_teacher(
    response: Response,
    username: str = Body(...),
    fullName: str = Body(...),
    password: str = Body(...),
    db: Session = Depends(get_db),
):
    if not TEACHER_USERNAME_PATTERN.match(username):
        raise HTTPException(status_code=400, detail="Teacher username must match TCH-<number>, for example TCH-001")

    existing_teacher = db.query(Teacher).filter(Teacher.username == username).first()

    if existing_teacher:
        raise HTTPException(status_code=400, detail="Teacher already exists")

    teacher = Teacher(username=username, fullName=fullName, password=password)
    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    auth_payload = build_teacher_auth_payload(teacher)
    set_auth_cookie(response, auth_payload["access_token"])

    return {"message": "Teacher registered successfully", **auth_payload}


@app.post("/teacher/login")
async def login_teacher(
    response: Response,
    username: str = Body(...),
    password: str = Body(...),
    db: Session = Depends(get_db),
):
    if not TEACHER_USERNAME_PATTERN.match(username):
        raise HTTPException(status_code=400, detail="Teacher username must match TCH-<number>, for example TCH-001")

    teacher = db.query(Teacher).filter(Teacher.username == username).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    if teacher.password != password:
        raise HTTPException(status_code=401, detail="Invalid password")

    auth_payload = build_teacher_auth_payload(teacher)
    set_auth_cookie(response, auth_payload["access_token"])

    return {"message": "Teacher login successful", **auth_payload}


@app.post("/teacher/subjects")
async def create_subject(
    response: Response,
    code: str = Body(...),
    name: str = Body(...),
    description: str = Body(None),
    request: Request = None,
    db: Session = Depends(get_db),
):
    # ensure teacher
    token = extract_access_token(request)
    payload = decode_access_token(token)

    if payload.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create sessions")

    teacher = db.query(Teacher).filter(Teacher.username == payload["sub"]).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    # ensure teacher doesn't already have a subject with the same code
    existing = db.query(Subject).filter(Subject.teacher_id == teacher.id, Subject.code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject code already exists for this teacher")

    # total_classes starts at 0; it will be incremented when attendance is recorded
    subject = Subject(code=code, name=name, description=description, teacher_id=teacher.id)
    db.add(subject)
    db.commit()
    db.refresh(subject)

    return {"message": "Subject created", "subject": {"id": subject.id, "code": subject.code, "name": subject.name, "description": subject.description, "total_classes": subject.total_classes}}


@app.delete("/teacher/subjects/{subject_id}")
async def delete_subject(subject_id: int, request: Request, db: Session = Depends(get_db)):
    token = extract_access_token(request)
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing authentication token")

    if payload.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete sessions")

    teacher = db.query(Teacher).filter(Teacher.username == payload["sub"]).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.teacher_id == teacher.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # delete enrollments and attendance records for this subject
    db.query(Enrollment).filter(Enrollment.subject_id == subject.id).delete()
    db.query(AttendanceRecord).filter(AttendanceRecord.subject_id == subject.id).delete()
    db.delete(subject)
    db.commit()

    return {"message": "Subject deleted"}


@app.get("/teacher/subjects")
async def list_teacher_subjects(request: Request, db: Session = Depends(get_db)):
    token = extract_access_token(request)
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing authentication token")

    if payload.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can list their sessions")

    teacher = db.query(Teacher).filter(Teacher.username == payload["sub"]).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    subjects = db.query(Subject).filter(Subject.teacher_id == teacher.id).all()

    result = []
    for s in subjects:
        total_enrolled = db.query(Enrollment).filter(Enrollment.subject_id == s.id).count()
        result.append({"id": s.id, "code": s.code, "name": s.name, "description": s.description, "total_enrolled": total_enrolled, "total_classes": s.total_classes})

    return {"subjects": result}


@app.get("/subjects")
async def list_subjects(request: Request, db: Session = Depends(get_db)):
    current_student = None
    try:
        token = extract_access_token(request)
        payload = decode_access_token(token)
        if payload.get("role") == "student":
            current_student = db.query(Student).filter(Student.studentId == payload["sub"]).first()
    except Exception:
        current_student = None

    subjects = db.query(Subject).all()
    result = []
    for s in subjects:
        total_enrolled = db.query(Enrollment).filter(Enrollment.subject_id == s.id).count()
        teacher = db.query(Teacher).filter(Teacher.id == s.teacher_id).first()
        is_enrolled = False
        present_classes = 0

        if current_student:
            enrollment = (
                db.query(Enrollment)
                .filter(Enrollment.subject_id == s.id, Enrollment.student_id == current_student.id)
                .first()
            )
            is_enrolled = enrollment is not None
            if is_enrolled:
                present_classes = (
                    db.query(AttendanceRecord)
                    .filter(
                        AttendanceRecord.subject_id == s.id,
                        AttendanceRecord.student_id == current_student.id,
                        AttendanceRecord.present == 1,
                    )
                    .count()
                )

        result.append({
            "id": s.id,
            "code": s.code,
            "name": s.name,
            "description": s.description,
            "teacher_username": teacher.username if teacher else None,
            "teacher_full_name": teacher.fullName if teacher else None,
            "total_enrolled": total_enrolled,
            "total_classes": s.total_classes,
            "is_enrolled": is_enrolled,
            "present_classes": present_classes,
        })
    return {"subjects": result}


@app.post("/subjects/{subject_id}/unenroll")
async def unenroll_from_subject(subject_id: int, request: Request, db: Session = Depends(get_db)):
    token = extract_access_token(request)
    payload = decode_access_token(token)

    if payload.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can unenroll from subjects")

    student = db.query(Student).filter(Student.studentId == payload["sub"]).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.subject_id == subject_id, Enrollment.student_id == student.id)
        .first()
    )

    if not enrollment:
        return {"message": "Not enrolled", "total_enrolled": db.query(Enrollment).filter(Enrollment.subject_id == subject_id).count()}

    db.delete(enrollment)
    db.commit()

    return {
        "message": "Unenrolled successfully",
        "total_enrolled": db.query(Enrollment).filter(Enrollment.subject_id == subject_id).count(),
    }


@app.post("/subjects/{subject_id}/enroll")
async def enroll_in_subject(subject_id: int, request: Request, db: Session = Depends(get_db)):
    token = extract_access_token(request)
    payload = decode_access_token(token)

    if payload.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can enroll in subjects")

    student = db.query(Student).filter(Student.studentId == payload["sub"]).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    subject = db.query(Subject).filter(Subject.id == subject_id).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    existing = db.query(Enrollment).filter(Enrollment.subject_id == subject_id, Enrollment.student_id == student.id).first()
    if existing:
        total_enrolled = db.query(Enrollment).filter(Enrollment.subject_id == subject_id).count()
        return {"message": "Already enrolled", "total_enrolled": total_enrolled}

    enrollment = Enrollment(subject_id=subject_id, student_id=student.id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    total_enrolled = db.query(Enrollment).filter(Enrollment.subject_id == subject_id).count()

    return {"message": "Enrolled successfully", "total_enrolled": total_enrolled}


@app.delete("/student/account")
async def delete_student_account(response: Response, request: Request, db: Session = Depends(get_db)):
    token = extract_access_token(request)
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing authentication token")

    if payload.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can delete their account")

    student = db.query(Student).filter(Student.studentId == payload["sub"]).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # delete attendance records and enrollments
    db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).delete()
    db.query(Enrollment).filter(Enrollment.student_id == student.id).delete()
    db.delete(student)
    db.commit()

    # clear cookie
    response.delete_cookie(key="access_token", path="/")

    return {"message": "Student account deleted"}


@app.delete("/teacher/account")
async def delete_teacher_account(response: Response, request: Request, db: Session = Depends(get_db)):
    token = extract_access_token(request)
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing authentication token")

    if payload.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete their account")

    teacher = db.query(Teacher).filter(Teacher.username == payload["sub"]).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    # find subjects and delete related data
    subjects = db.query(Subject).filter(Subject.teacher_id == teacher.id).all()
    for subject in subjects:
        db.query(Enrollment).filter(Enrollment.subject_id == subject.id).delete()
        db.query(AttendanceRecord).filter(AttendanceRecord.subject_id == subject.id).delete()
        db.delete(subject)

    db.delete(teacher)
    db.commit()

    response.delete_cookie(key="access_token", path="/")

    return {"message": "Teacher account deleted"}


@app.post("/student/login/face")
async def login_student_face(
    response: Response,
    image: UploadFile = File(),
    db: Session = Depends(get_db),
):
    if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only image files allowed")

    try:
        image_bytes = await image.read()
        embedding = attendance_ai.single_face_embedding_extraction(
            image_bytes=image_bytes
        )
        query_embedding = embedding.tolist()

        distance = Student.embedding.cosine_distance(query_embedding).label("distance")
        statement = (
            select(Student, distance)
            .order_by(distance)
            .limit(1)
        )
        result = db.execute(statement).first()

        if not result:
            raise HTTPException(status_code=404, detail="No matching face found")

        matched_student, best_distance = result

        if best_distance is None or float(best_distance) > FACE_MATCH_THRESHOLD:
            raise HTTPException(status_code=404, detail="No matching face found")

        auth_payload = build_auth_payload(matched_student)
        if response is not None:
            set_auth_cookie(response, auth_payload["access_token"])

        return {
            "message": "Face login successful",
            **auth_payload,
            "distance": float(best_distance),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e) if str(e) else "unable to login with face",
        )


@app.get("/auth/me")
async def auth_me(request: Request, db: Session = Depends(get_db)):
    token = extract_access_token(request)
    payload = decode_access_token(token)
    role = payload.get("role")

    if role == "teacher":
        teacher = db.query(Teacher).filter(Teacher.username == payload["sub"]).first()

        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")

        return {
            "role": "teacher",
            "username": teacher.username,
            "full_name": teacher.fullName,
        }

    student = db.query(Student).filter(Student.studentId == payload["sub"]).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return {
        "role": "student",
        "student_id": student.studentId,
        "full_name": student.fullName,
    }


@app.post("/mark-attendance")
async def mark_attendance(image: Annotated[UploadFile, File()]):
    if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only image files allowed")
    try:
        image_bytes = await image.read()
        embeddings = attendance_ai.multiple_face_embedding_extraction(
            image_bytes=image_bytes
        )
        if not embeddings:
            raise HTTPException(status_code=400, detail="No faces detected")
        return {"embeddings": len(embeddings)}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e) if str(e) else "internal server error",
        )


@app.post("/teacher/subjects/{subject_id}/attendance")
async def take_attendance(
    subject_id: int,
    request: Request,
    image: UploadFile = File(),
    db: Session = Depends(get_db),
):
    if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only image files allowed")

    token = extract_access_token(request)
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing authentication token")

    if payload.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can take attendance")

    teacher = db.query(Teacher).filter(Teacher.username == payload["sub"]).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.teacher_id == teacher.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    enrolled_students = (
        db.query(Student)
        .join(Enrollment, Enrollment.student_id == Student.id)
        .filter(Enrollment.subject_id == subject_id)
        .all()
    )
    if not enrolled_students:
        raise HTTPException(status_code=400, detail="No students enrolled in this subject")

    enrolled_student_ids = {student.id for student in enrolled_students}

    try:
        image_bytes = await image.read()
        embeddings = attendance_ai.multiple_face_embedding_extraction(image_bytes=image_bytes)

        matched_student_ids = set()

        if embeddings:
            for face in embeddings:
                query_embedding = getattr(face, "embedding", None)
                if query_embedding is None and hasattr(face, "tolist"):
                    query_embedding = face.tolist()

                if query_embedding is None:
                    continue

                if hasattr(query_embedding, "tolist"):
                    query_embedding = query_embedding.tolist()

                distance = Student.embedding.cosine_distance(query_embedding).label("distance")
                statement = select(Student, distance).order_by(distance).limit(1)
                result = db.execute(statement).first()

                if not result:
                    continue

                matched_student, best_distance = result
                if best_distance is None or float(best_distance) > FACE_MATCH_THRESHOLD:
                    continue

                if matched_student.id not in enrolled_student_ids:
                    continue

                matched_student_ids.add(matched_student.id)

        session_time = datetime.now(timezone.utc)
        present_students = []
        absent_students = []

        for student in enrolled_students:
            is_present = 1 if student.id in matched_student_ids else 0
            db.add(
                AttendanceRecord(
                    subject_id=subject_id,
                    student_id=student.id,
                    present=is_present,
                    recorded_at=session_time,
                )
            )

            student_payload = {
                "student_id": student.studentId,
                "full_name": student.fullName,
            }
            if is_present:
                present_students.append(student_payload)
            else:
                absent_students.append(student_payload)

        subject.total_classes = (subject.total_classes or 0) + 1
        db.commit()

        return {
            "message": "Attendance recorded",
            "subject_id": subject.id,
            "total_enrolled": len(enrolled_students),
            "total_classes": subject.total_classes,
            "present_count": len(present_students),
            "absent_count": len(absent_students),
            "present_students": present_students,
            "absent_students": absent_students,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e) if str(e) else "unable to take attendance")


@app.get("/teacher/subjects/{subject_id}/attendance-records")
async def get_attendance_records(
    subject_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    token = extract_access_token(request)
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing authentication token")

    if payload.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view attendance records")

    teacher = db.query(Teacher).filter(Teacher.username == payload["sub"]).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.teacher_id == teacher.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    total_enrolled = db.query(Enrollment).filter(Enrollment.subject_id == subject_id).count()

    rows = (
        db.query(AttendanceRecord, Student)
        .join(Student, AttendanceRecord.student_id == Student.id)
        .filter(AttendanceRecord.subject_id == subject_id)
        .order_by(AttendanceRecord.recorded_at.desc())
        .all()
    )

    grouped = defaultdict(list)
    for record, student in rows:
        grouped[record.recorded_at].append(
            {
                "student_id": student.studentId,
                "full_name": student.fullName,
                "present": bool(record.present),
            }
        )

    sessions = []
    for recorded_at, present_students in grouped.items():
        present_list = [student for student in present_students if student["present"]]
        absent_list = [student for student in present_students if not student["present"]]
        sessions.append(
            {
                "recorded_at": recorded_at.isoformat() if recorded_at else None,
                "present_count": len(present_list),
                "absent_count": len(absent_list),
                "total_enrolled": total_enrolled,
                "present_students": [{"student_id": student["student_id"], "full_name": student["full_name"]} for student in present_list],
                "absent_students": [{"student_id": student["student_id"], "full_name": student["full_name"]} for student in absent_list],
            }
        )

    return {
        "subject_id": subject.id,
        "subject_name": subject.name,
        "total_enrolled": total_enrolled,
        "sessions": sessions,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the traceback to server console for debugging
    traceback.print_exc()
    # Ensure CORS headers are present in error responses so the browser can see the real error
    headers = {
        "Access-Control-Allow-Origin": CLIENT_URL,
        "Access-Control-Allow-Credentials": "true",
    }
    return JSONResponse(status_code=500, content={"detail": str(exc)}, headers=headers)
