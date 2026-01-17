import Attendance from "../models/Attendance.model.js";

export const markAttendance = async (req, res) => {
  const record = await Attendance.create(req.body);
  res.json(record);
};

export const getAttendance = async (req, res) => {
  const data = await Attendance.find({ student: req.user.id });
  res.json(data);
};
