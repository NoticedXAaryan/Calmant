"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Calendar, Clock } from "lucide-react";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: { title: string; description: string; deadline: string; estimatedMins: number }) => void;
}

export default function AddTaskModal({ isOpen, onClose, onAdd }: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [estimatedMins, setEstimatedMins] = useState(60);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;
    onAdd({ title, description, deadline: new Date(deadline).toISOString(), estimatedMins });
    setTitle("");
    setDescription("");
    setDeadline("");
    setEstimatedMins(60);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>
                Add New Task
              </h2>
              <button className="btn-ghost" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Task Title *
                </label>
                <input
                  className="input-field"
                  type="text"
                  placeholder='e.g., "Prepare for Chemistry exam"'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Description
                </label>
                <textarea
                  className="input-field"
                  placeholder="What does this task involve?"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <Calendar size={12} /> Deadline *
                  </label>
                  <input
                    className="input-field"
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                    style={{ colorScheme: "dark" }}
                  />
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <Clock size={12} /> Estimated Time
                  </label>
                  <select
                    className="input-field"
                    value={estimatedMins}
                    onChange={(e) => setEstimatedMins(Number(e.target.value))}
                    style={{ colorScheme: "dark" }}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                    <option value={240}>4 hours</option>
                    <option value={480}>8 hours</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Plus size={16} /> Add Task
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
