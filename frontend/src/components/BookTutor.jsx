/**
 * Book Tutor Modal
 *
 * Beautiful, modern modal for booking tutors
 * Features:
 * - Tutor selection with cards
 * - Subject preference from user's goals
 * - Calendar-based scheduling
 * - Duration selection
 * - Session type selection
 * - Confirmation modal
 *
 * Currently mocked - will integrate with API later
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui/button";
import {
  X,
  Calendar,
  Clock,
  Star,
  Check,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import { mockTutors, getTutorsBySubject } from "../data/mockTutors";
import toast from "react-hot-toast";

const DURATIONS = ["30 min", "1 hour", "1.5 hours", "2 hours"];

// Helper function to convert duration string to hours (decimal)
const getDurationHours = (durationStr) => {
  if (durationStr === "30 min") return 0.5;
  if (durationStr === "1 hour") return 1;
  if (durationStr === "1.5 hours") return 1.5;
  if (durationStr === "2 hours") return 2;
  return 1; // default
};

export function BookTutor({ isOpen, onClose, userGoals = [] }) {
  // Form state
  const [step, setStep] = useState(1); // 1: subject, 2: tutor, 3: details, 4: confirmation
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("1 hour");
  const [specificQuestions, setSpecificQuestions] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Get unique subjects from user's goals, filter out empty ones
  const goalSubjects = [
    ...new Set(
      userGoals
        .map((g) => g.subject || g.goal) // Use goal name if subject is empty
        .filter((s) => s) // Remove empty values
    ),
  ];

  // Show "All Subjects" only if multiple goals
  const showAllSubjects = goalSubjects.length > 1;

  // Get available tutors based on selected subject
  const availableTutors =
    selectedSubject && selectedSubject !== "All Subjects"
      ? getTutorsBySubject(selectedSubject)
      : mockTutors;

  // Get available time slots
  const getTimeSlots = () => {
    if (!selectedTutor || !selectedDate) return [];
    const slots = selectedTutor.availableSlots
      .filter((slot) => slot.startsWith(selectedDate))
      .map((slot) => slot.split(" ")[1]);
    return slots;
  };

  const timeSlots = getTimeSlots();

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedSubject || !selectedTutor || !selectedDate || !selectedTime) {
      toast.error("Please complete all required fields");
      return;
    }

    // Show confirmation modal
    setShowConfirmation(true);
  };

  // Handle booking confirmation
  const handleConfirmBooking = async () => {
    try {
      // Prepare booking data
      const bookingData = {
        id: `booking_${Date.now()}`,
        tutor_id: selectedTutor.id,
        tutor_name: selectedTutor.name,
        subject: selectedSubject,
        date: selectedDate,
        time: selectedTime,
        duration: selectedDuration,
        session_type: "video",
        specific_questions: specificQuestions,
        hourly_rate: selectedTutor.hourlyRate,
        total_amount:
          selectedTutor.hourlyRate * getDurationHours(selectedDuration),
        created_at: new Date().toISOString(),
        status: "pending",
      };

      // Store in localStorage (mock implementation)
      const existingBookings = JSON.parse(
        localStorage.getItem("tutor_bookings") || "[]"
      );
      existingBookings.push(bookingData);
      localStorage.setItem("tutor_bookings", JSON.stringify(existingBookings));

      // Log for debugging
      console.log("Booking created:", bookingData);

      toast.success("Tutor booking created! We'll confirm shortly.");
      resetForm();
      onClose();
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("Failed to create booking");
    }
  };

  // Reset form
  const resetForm = () => {
    setStep(1);
    setSelectedSubject("");
    setSelectedTutor(null);
    setSelectedDate("");
    setSelectedTime("");
    setSelectedDuration("1 hour");
    setSpecificQuestions("");
    setShowConfirmation(false);
  };

  // Handle close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  // Render modal at document root using Portal to avoid stacking context issues
  return createPortal(
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-gray-800 bg-opacity-50 z-[999] backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl my-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-xl font-bold text-white">Book a Tutor</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                      s < step
                        ? "bg-green-500 text-white"
                        : s === step
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {s < step ? <Check className="w-5 h-5" /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        s < step
                          ? "bg-green-500"
                          : "bg-gray-200 dark:bg-slate-700"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Subject Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  What subject do you need help with?
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {showAllSubjects && (
                    <button
                      onClick={() => setSelectedSubject("All Subjects")}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedSubject === "All Subjects"
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-slate-700 hover:border-blue-400"
                      }`}
                    >
                      <span className="text-sm font-medium">All Subjects</span>
                    </button>
                  )}
                  {goalSubjects.map((subject) => (
                    <button
                      key={subject}
                      onClick={() => setSelectedSubject(subject)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedSubject === subject
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-slate-700 hover:border-blue-400"
                      }`}
                    >
                      <span className="text-sm font-medium">{subject}</span>
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => {
                    if (selectedSubject) setStep(2);
                    else toast.error("Please select a subject");
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Step 2: Tutor Selection */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setStep(1)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Select Your Tutor
                  </h3>
                </div>

                {availableTutors.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      No tutors available for this subject. Try another subject.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {availableTutors.map((tutor) => (
                      <button
                        key={tutor.id}
                        onClick={() => setSelectedTutor(tutor)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          selectedTutor?.id === tutor.id
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-slate-700 hover:border-blue-400"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <span className="text-3xl">{tutor.avatar}</span>
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {tutor.name}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {tutor.bio}
                              </p>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                  <span className="text-sm font-medium">
                                    {tutor.rating}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({tutor.reviews})
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                  ${tutor.hourlyRate}/hr
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <Button
                  onClick={() => {
                    if (selectedTutor) setStep(3);
                    else toast.error("Please select a tutor");
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Step 3: Booking Details */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setStep(2)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Schedule Your Session
                  </h3>
                </div>

                {/* Selected Tutor Summary */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedTutor?.avatar}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedTutor?.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ${selectedTutor?.hourlyRate}/hour
                      </p>
                    </div>
                  </div>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Select Date
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      ...new Set(
                        selectedTutor?.availableSlots.map(
                          (s) => s.split(" ")[0]
                        )
                      ),
                    ].map((date) => (
                      <button
                        key={date}
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedTime(""); // Reset time when date changes
                        }}
                        className={`p-2 rounded-lg text-sm border-2 transition-all ${
                          selectedDate === date
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-slate-700 hover:border-blue-400"
                        }`}
                      >
                        {new Date(date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Select Time
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`p-2 rounded-lg text-sm border-2 transition-all ${
                            selectedTime === time
                              ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-200 dark:border-slate-700 hover:border-blue-400"
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Duration Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Duration
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DURATIONS.map((duration) => (
                      <button
                        key={duration}
                        onClick={() => setSelectedDuration(duration)}
                        className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                          selectedDuration === duration
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-slate-700 hover:border-blue-400"
                        }`}
                      >
                        {duration}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Questions */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    What specific topics do you want to focus on? (Optional)
                  </label>
                  <textarea
                    value={specificQuestions}
                    onChange={(e) => setSpecificQuestions(e.target.value)}
                    placeholder="E.g., I need help with algebraic equations and solving for x..."
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    rows="3"
                  />
                </div>

                {/* Booking Summary */}
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Booking Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Rate:
                      </span>
                      <span className="font-medium">
                        ${selectedTutor?.hourlyRate}/hour
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Duration:
                      </span>
                      <span className="font-medium">{selectedDuration}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-slate-600 pt-2 mt-2 flex justify-between">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Estimated Cost:
                      </span>
                      <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                        $
                        {(
                          selectedTutor?.hourlyRate *
                          getDurationHours(selectedDuration)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
                >
                  Review & Confirm Booking
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-gray-800 bg-opacity-50 z-[9999]"
            onClick={() => setShowConfirmation(false)}
          />

          {/* Confirmation Card */}
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full z-[10001]">
            <div className="text-center space-y-6">
              {/* Success Icon */}
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center animate-bounce">
                <Check className="w-8 h-8 text-white" />
              </div>

              {/* Confirmation Text */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Booking Confirmed!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Your session with {selectedTutor?.name} is ready.
                </p>
              </div>

              {/* Session Details */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Tutor:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedTutor?.name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Date & Time:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedDate} at {selectedTime}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Duration:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedDuration}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Amount:
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    $
                    {(
                      selectedTutor?.hourlyRate *
                      getDurationHours(selectedDuration)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We'll send you a confirmation email shortly with login
                  details.
                </p>
                <Button
                  onClick={() => {
                    handleConfirmBooking();
                  }}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:opacity-90"
                >
                  Complete Booking
                </Button>
                <Button
                  onClick={() => setShowConfirmation(false)}
                  variant="outline"
                  className="w-full"
                >
                  Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
