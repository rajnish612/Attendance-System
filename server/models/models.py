from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from utils.db import Base


class Student(Base):

    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)

    studentId = Column(String, unique=True)

    fullName = Column(String)

    password = Column(String)

    embedding = Column(Vector(512))

    attendance_records = relationship("AttendanceRecord", back_populates="student")


class Teacher(Base):

    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String, unique=True)

    fullName = Column(String)

    password = Column(String)



class Subject(Base):

    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)

    code = Column(String, index=True)

    name = Column(String)

    description = Column(String, nullable=True)

    teacher_id = Column(Integer, ForeignKey("teachers.id"))

    total_classes = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    enrollments = relationship("Enrollment", back_populates="subject")

    attendance_records = relationship("AttendanceRecord", back_populates="subject")

    __table_args__ = (UniqueConstraint("teacher_id", "code", name="uix_teacher_code"),)


class Enrollment(Base):

    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)

    subject_id = Column(Integer, ForeignKey("subjects.id"))

    student_id = Column(Integer, ForeignKey("students.id"))

    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())

    subject = relationship("Subject", back_populates="enrollments")


class AttendanceRecord(Base):

    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)

    subject_id = Column(Integer, ForeignKey("subjects.id"))

    student_id = Column(Integer, ForeignKey("students.id"))

    present = Column(Integer, default=1)

    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    subject = relationship("Subject", back_populates="attendance_records")

    student = relationship("Student", back_populates="attendance_records")
