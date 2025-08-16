import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import {
  Target,
  Plus,
  Edit3,
  CheckCircle,
  Circle,
  Calendar,
  X,
  PlayCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Clock,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Star,
} from "lucide-react-native";
import Card from "@/components/ui/card";
import WeeklyGoalsSummary from "@/components/WeeklyGoalsSummary";
import GoalProgressTracker from "@/components/GoalProgressTracker";
import WeeklyReflection from "@/components/WeeklyReflection";
import HabitGoalIntegration from "@/components/HabitGoalIntegration";

interface GeneratePlanResponse {
  success: boolean;
  message: string;
  data: {
    goal: ExtendedGoal;
    action_plan: {
      goal_id: string;
      goal_title: string;
      action_items: ActionItem[];
      total_estimated_time_per_week: string;
      health_adaptations: string[];
      created_at: string;
      user_email: string;
      id: string;
    };
    weekly_schedule: {
      start_date: string;
      end_date: string;
      daily_schedules: {
        [key: string]: {
          date: string;
          time_slots: Array<{
            start_time: string;
            end_time: string;
            duration: string;
            pillar: string;
            action_item: string;
            frequency: string | null;
            priority: string | null;
            health_notes: string[];
          }>;
          total_duration: string;
          pillars_covered: string[];
        };
      };
      total_weekly_hours: number;
      pillar_distribution: {
        [key: string]: number;
      };
      health_adaptations: string[];
      schedule_notes: string[];
      goal_id: string;
      user_email: string;
      created_at: string;
      id: string;
    };
  };
}

interface DeleteFileButtonProps {
  onDelete: () => Promise<void>;
}

const DeleteFileButton: React.FC<DeleteFileButtonProps> = ({ onDelete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { isDarkMode } = useTheme();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete();
      // Don't set isLoading to false - stays in loading state forever as requested
    } catch (error) {
      setIsLoading(false); // Only reset on error
    }
  };

  return (
    <TouchableOpacity
      onPress={handleDelete}
      disabled={isLoading}
      className={`px-2 py-1 rounded ${
        isLoading
          ? isDarkMode
            ? "bg-gray-700"
            : "bg-gray-100"
          : isDarkMode
          ? "bg-red-900/50"
          : "bg-red-100"
      }`}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={isDarkMode ? "#f87171" : "#dc2626"}
        />
      ) : (
        <Text
          className={`text-[10px] font-semibold ${
            isDarkMode ? "text-red-400" : "text-red-600"
          }`}
        >
          Delete
        </Text>
      )}
    </TouchableOpacity>
  );
};

interface ActionItemCardProps {
  item: ActionItem;
  onPress: () => void;
}

const ActionItemCard: React.FC<ActionItemCardProps> = ({ item, onPress }) => {
  const { isDarkMode } = useTheme();
  const scheduledDays = Object.entries(item.weekly_schedule || {})
    .filter(
      ([key, value]) =>
        [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ].includes(key) &&
        value &&
        value.time_slots &&
        value.time_slots.length > 0
    )
    .map(([day]) => day);

  return (
    <TouchableOpacity className="mt-3" onPress={onPress}>
      <View
        className={`shadow rounded-lg p-4 ${
          isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
        }`}
      >
        <Text
          className={`text-base font-medium mb-1 ${
            isDarkMode ? "text-gray-100" : "text-gray-800"
          }`}
        >
          {item.title}
        </Text>
        <Text
          className={`text-sm mb-2 ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          {item.description}
        </Text>
        {scheduledDays.length > 0 && (
          <View className="flex-row flex-wrap mt-1">
            {scheduledDays.map((day) => (
              <View
                key={day}
                className={`rounded px-2 py-1 mr-1 mb-1 ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-xs ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
import { useGoals } from "@/hooks/useGoals";
import {
  Goal,
  GoalPriority,
  GoalCategory,
  ActionPlan,
  WeeklySchedule,
} from "@/types/goals";
import {
  PillarType,
  PillarTimePreferences,
  TimePreference,
} from "@/types/preferences";

interface ActionTimeSlot {
  start_time: string;
  end_time: string;
  duration: string;
  pillar: string;
  frequency: string | null;
  priority: string | null;
  health_notes: string[];
}

interface DailySchedule {
  date: string;
  time_slots: ActionTimeSlot[];
  total_duration: string;
}

interface WeeklyActionSchedule {
  monday: DailySchedule | null;
  tuesday: DailySchedule | null;
  wednesday: DailySchedule | null;
  thursday: DailySchedule | null;
  friday: DailySchedule | null;
  saturday: DailySchedule | null;
  sunday: DailySchedule | null;
  total_weekly_duration: string;
  pillar_distribution: {
    [key: string]: number;
  };
}

interface ActionItem {
  title: string;
  description: string;
  priority: string;
  time_estimate: {
    min_duration: string;
    max_duration: string;
    recommended_frequency: string;
    time_of_day: string | null;
  };
  prerequisites: string[];
  success_criteria: string[];
  adaptation_notes: string[];
  weekly_schedule: WeeklyActionSchedule;
}

// Extend the Goal interface to include action_plan
interface ExtendedGoal extends Goal {
  action_plan?: {
    goal_id: string;
    goal_title: string;
    action_items: ActionItem[];
    total_estimated_time_per_week: string;
    health_adaptations: string[];
    created_at: string;
    user_email: string;
    id: string;
  };
  weekly_schedule?: {
    start_date: string;
    end_date: string;
    daily_schedules: {
      [key: string]: {
        date: string;
        time_slots: Array<{
          start_time: string;
          end_time: string;
          duration: string;
          pillar: string;
          action_item: string;
          frequency: string | null;
          priority: string | null;
          health_notes: string[];
        }>;
        total_duration: string;
        pillars_covered: string[];
      };
    };
    total_weekly_hours: number;
    pillar_distribution: {
      [key: string]: number;
    };
    health_adaptations: string[];
    schedule_notes: string[];
    goal_id: string;
    user_email: string;
    created_at: string;
    id: string;
  };
}
import { goalsApi } from "@/services/goalsApi";

export default function GoalsScreen() {
  const { user } = useAuth();
  const userEmail = user?.email || "";
  const userName = user?.name || "";

  useEffect(() => {
    console.log("Current user context:", {
      userEmail,
      userName,
    });
  }, [userEmail, userName]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatingGoalId, setGeneratingGoalId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [selectedActionItem, setSelectedActionItem] =
    useState<ActionItem | null>(null);
  const [activePlan, setActivePlan] = useState<{
    actionPlan: ActionPlan;
    weeklySchedule: any;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    uploadId: string;
    filename: string;
    percentage: number;
    message: string;
    status: "processing" | "completed" | "failed";
    entitiesCount: number;
    relationshipsCount: number;
  } | null>(null);

  // Use the goals hook for backend integration
  const {
    goals,
    loading,
    error,
    stats,
    createGoal,
    updateGoal,
    deleteGoal,
    updateGoalProgress,
    addGoalNote,
    saveWeeklyReflection,
    loadGoals,
  } = useGoals({ userEmail }) as {
    goals: ExtendedGoal[];
    loading: boolean;
    error: string | null;
    stats: any;
    createGoal: Function;
    updateGoal: Function;
    deleteGoal: Function;
    updateGoalProgress: Function;
    addGoalNote: Function;
    saveWeeklyReflection: Function;
    loadGoals: Function;
  };

  // Form state for adding/editing goals
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as GoalPriority,
    category: "health" as GoalCategory,
    dueDate: new Date(),
  });

  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "health":
        return "❤️";
      case "fitness":
        return "💪";
      case "nutrition":
        return "🥗";
      case "mental":
        return "🧠";
      case "personal":
        return "⭐";
      default:
        return "🎯";
    }
  };

  const getProgressPercentage = (goal: Goal) => {
    if (!goal.target_value || !goal.current_value) return 0;
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const handleAddGoal = async () => {
    if (!formData.title.trim()) {
      Alert.alert("Error", "Please enter a goal title");
      return;
    }

    try {
      await createGoal({
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        category: formData.category,
        due_date: formData.dueDate.toISOString(),
      });

      setShowAddGoal(false);
      setShowSuggestions(false);
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        category: "health",
        dueDate: new Date(),
      });
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to create goal"
      );
    }
  };

  const handleUpdateProgress = async (goalId: string, newValue: number) => {
    try {
      await updateGoalProgress(goalId, newValue);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to update progress"
      );
    }
  };

  const handleToggleComplete = async (goalId: string) => {
    try {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;

      await updateGoal(goalId, { completed: !goal.completed });
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to update goal"
      );
    }
  };

  const handleAddNote = async (goalId: string, note: string) => {
    if (!note.trim()) return;

    try {
      await addGoalNote(goalId, note);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to add note"
      );
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "text/plain",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        return file;
      }
      return null;
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document. Please try again.");
      return null;
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null);
  const [uploadingUploadId, setUploadingUploadId] = useState<string | null>(
    null
  );
  const [uploadedFiles, setUploadedFiles] = useState<
    {
      id?: string;
      upload_id?: string;
      name: string;
      type: string;
      size: number;
      status?: string;
      entities_count?: number;
      relationships_count?: number;
    }[]
  >([]);
  const uploadMonitorActiveRef = useRef(false);
  const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const dedupeFiles = (files: typeof uploadedFiles) => {
    const map = new Map<string, any>();
    files.forEach((f) => map.set(f.upload_id || f.id || f.name, f));
    return Array.from(map.values());
  };

  // Using goalsApi for file upload operations
  const uploadFileToServer = async (
    file: DocumentPicker.DocumentPickerAsset
  ) => {
    try {
      if (!userEmail) {
        console.error("User email missing. Context:", { userEmail, user });
        throw new Error("User email is required for document upload");
      }

      // For all uploads, pass the file info and userEmail
      return await goalsApi.uploadDocument(
        file.file || {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream",
        },
        userEmail
      );
    } catch (error) {
      console.error("Upload error details:", error);
      throw error;
    }
  };

  // Fetch existing uploaded files when modal is opened
  useEffect(() => {
    const fetchFiles = async () => {
      if (!showUploadModal) return;
      try {
        const files = await goalsApi.getUploadedFiles(userEmail);
        const mapped = files.map((f: any) => ({
          id: f.id,
          upload_id: f.upload_id,
          name: f.filename,
          type: f.extension,
          size: f.size,
          status: f.status,
          entities_count: f.entities_count,
          relationships_count: f.relationships_count,
        }));
        setUploadedFiles(dedupeFiles(mapped));
      } catch (err) {
        console.warn("Failed to load uploaded files", err);
      }
    };
    fetchFiles();
  }, [showUploadModal, userEmail]);

  useEffect(() => {
    return () => {
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }
      uploadMonitorActiveRef.current = false;
    };
  }, []);

  const monitorUploadProgress = async (uploadId: string) => {
    try {
      return await goalsApi.monitorUploadProgress(uploadId);
    } catch (error) {
      console.error("Progress monitoring error:", error);
      throw error;
    }
  };

  const handleFileUpload = async () => {
    try {
      // Step 1: Pick document
      const file = await pickDocument();
      if (!file) return;

      // Check if file is already being uploaded
      if (uploadingFileId === file.name) {
        Alert.alert(
          "Upload in Progress",
          "This file is already being uploaded. Please wait for it to complete."
        );
        return;
      }

      // Check if file is already uploaded
      if (uploadedFiles.some((f) => f.name === file.name)) {
        Alert.alert(
          "File Already Uploaded",
          "This file has already been uploaded."
        );
        return;
      }

      // Test if backend is reachable
      const isBackendReachable = await goalsApi.testBackendConnection();
      if (!isBackendReachable) {
        console.error("Backend not reachable");
        Alert.alert(
          "Connection Error",
          "Cannot connect to the backend server. Please make sure the API server is running."
        );
        return;
      }

      // Step 2: Start upload process
      setIsUploading(true);
      setUploadingFileId(file.name);
      setUploadingUploadId("temp-id");
      setUploadProgress({
        uploadId: "temp-id",
        filename: file.name,
        percentage: 5,
        message: "Preparing file for upload...",
        status: "processing",
        entitiesCount: 0,
        relationshipsCount: 0,
      });

      // Step 3: Simulate file preparation
      await new Promise((resolve) => setTimeout(resolve, 500));
      setUploadProgress((prev) =>
        prev
          ? { ...prev, message: "Reading file content...", percentage: 10 }
          : null
      );

      // Step 4: Upload file to server
      await new Promise((resolve) => setTimeout(resolve, 300));
      setUploadProgress((prev) =>
        prev
          ? { ...prev, message: "Uploading file to server...", percentage: 15 }
          : null
      );

      const { upload_id } = await uploadFileToServer(file);

      setUploadingUploadId(upload_id);
      setUploadProgress((prev) =>
        prev
          ? {
              ...prev,
              uploadId: upload_id,
              message: "File uploaded successfully, starting analysis...",
              percentage: 25,
            }
          : null
      );

      // Step 5: Monitor progress with enhanced messaging
      if (uploadMonitorActiveRef.current) {
        console.log("Upload monitor already active, skipping new interval");
        return;
      }
      uploadMonitorActiveRef.current = true;
      const progressInterval = setInterval(async () => {
        try {
          const progress = await monitorUploadProgress(upload_id);

          // Enhanced progress messages based on percentage
          let enhancedMessage = progress.message;
          if (progress.percentage <= 30) {
            enhancedMessage = "Extracting text from document...";
          } else if (progress.percentage <= 50) {
            enhancedMessage = "Analyzing document structure...";
          } else if (progress.percentage <= 70) {
            enhancedMessage = "Identifying medical entities...";
          } else if (progress.percentage <= 90) {
            enhancedMessage = "Extracting relationships and connections...";
          } else if (progress.percentage < 100) {
            enhancedMessage = "Finalizing analysis...";
          }

          setUploadProgress((prev) =>
            prev
              ? {
                  ...prev,
                  percentage: progress.percentage,
                  message: enhancedMessage,
                  status: progress.status,
                  entitiesCount: progress.entities_count || 0,
                  relationshipsCount: progress.relationships_count || 0,
                }
              : null
          );

          // Stop monitoring if completed or failed
          if (progress.status === "completed" || progress.status === "failed") {
            clearInterval(progressInterval);
            setIsUploading(false);
            setUploadingFileId(null);
            setUploadingUploadId(null);
            uploadMonitorActiveRef.current = false;

            if (progress.status === "completed") {
              // Show completion message briefly
              setUploadProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      message:
                        "Analysis complete! Document processed successfully.",
                      percentage: 100,
                    }
                  : null
              );

              // Refresh uploaded files list from backend
              try {
                if (!userEmail) {
                  console.warn(
                    "User email is undefined, skipping file refresh"
                  );
                  return;
                }
                const files = await goalsApi.getUploadedFiles(userEmail);
                const mapped = files.map((f: any) => ({
                  id: f.id,
                  upload_id: f.upload_id,
                  name: f.filename,
                  type: f.extension,
                  size: f.size,
                  status: f.status,
                  entities_count: f.entities_count,
                  relationships_count: f.relationships_count,
                }));
                setUploadedFiles(dedupeFiles(mapped));
              } catch (err) {
                console.warn("Failed to refresh uploaded files", err);
              }

              Alert.alert(
                "Success",
                "Document uploaded and analyzed successfully!"
              );
            } else {
              Alert.alert(
                "Error",
                "Document processing failed. Please try again."
              );
            }

            // Clear progress after a delay
            setTimeout(() => {
              setUploadProgress(null);
            }, 3000);
          }
        } catch (error) {
          console.error("Progress monitoring error:", error);
          clearInterval(progressInterval);
          setIsUploading(false);
          setUploadingFileId(null);
          setUploadingUploadId(null);
          setUploadProgress(null);
          uploadMonitorActiveRef.current = false;
          Alert.alert(
            "Error",
            "Failed to monitor upload progress. Please try again."
          );
        }
      }, 1000); // Check progress every second
    } catch (error) {
      console.error("Upload error:", error);
      setIsUploading(false);
      setUploadingFileId(null);
      setUploadingUploadId(null);
      setUploadProgress(null);
      Alert.alert(
        "Error",
        `Upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Please check if the backend server is running and try again.`
      );
    }
  };

  // Preferences state
  const emptyPref: TimePreference = {
    preferred_time: "07:00",
    duration_minutes: 30,
    days_of_week: [1, 3, 5],
    reminder_before_minutes: 10,
  } as TimePreference;
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [timePreferences, setTimePreferences] = useState<
    Record<string, TimePreference>
  >({
    [PillarType.HEALTH]: { ...emptyPref },
    [PillarType.FITNESS]: { ...emptyPref, preferred_time: "08:00" },
    [PillarType.NUTRITION]: {
      ...emptyPref,
      preferred_time: "12:00",
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
    },
    [PillarType.MENTAL]: { ...emptyPref, preferred_time: "18:00" },
    [PillarType.PERSONAL]: { ...emptyPref, preferred_time: "20:00" },
  });

  // Inline banner to inform user while plan is being generated
  const GeneratingBanner = () =>
    generatingPlan ? (
      <View
        className={`mx-4 mt-3 mb-1 rounded-lg px-3 py-2 flex-row items-center border ${
          isDarkMode
            ? "bg-emerald-950/50 border-emerald-900"
            : "bg-emerald-50 border-emerald-200"
        }`}
      >
        <ActivityIndicator
          size="small"
          color={isDarkMode ? "#34d399" : "#059669"}
        />
        <Text
          className={`ml-2 text-sm ${
            isDarkMode ? "text-emerald-400" : "text-emerald-900"
          }`}
        >
          Generating plan… You can come back later once it is ready, as creating
          a detailed plan may take a while.
        </Text>
      </View>
    ) : null;

  const openPreferences = async () => {
    setShowPreferencesModal(true);
    setPreferencesLoading(true);
    try {
      const existing = await goalsApi.getTimePreferences(userEmail);
      if (existing?.preferences) {
        // existing.preferences keys are dynamic
        setTimePreferences((prev) => ({ ...prev, ...existing.preferences }));
      }
    } catch (e) {
      console.warn("Failed to load preferences", e);
    } finally {
      setPreferencesLoading(false);
    }
  };

  const updatePrefField = (
    pillar: PillarType,
    field: keyof TimePreference,
    value: any
  ) => {
    setTimePreferences((prev) => ({
      ...prev,
      [pillar]: { ...(prev[pillar] || emptyPref), [field]: value },
    }));
  };

  const toggleDay = (pillar: PillarType, day: number) => {
    setTimePreferences((prev) => {
      const p = prev[pillar] || emptyPref;
      const exists = p.days_of_week.includes(day);
      const days = exists
        ? p.days_of_week.filter((d: number) => d !== day)
        : [...p.days_of_week, day];
      return { ...prev, [pillar]: { ...p, days_of_week: days.sort() } };
    });
  };

  const savePreferences = async () => {
    try {
      setPreferencesLoading(true);
      await goalsApi.setTimePreferences({
        user_email: userEmail,
        preferences: timePreferences,
      });
      Alert.alert("Success", "Preferences saved");
      setShowPreferencesModal(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save preferences");
    } finally {
      setPreferencesLoading(false);
    }
  };

  const handleGeneratePlan = async (goalId: string, goal: ExtendedGoal) => {
    if (generatingPlan) return;

    // Default preferences - replace with actual preferences if needed
    const defaultPreferences: PillarTimePreferences = {
      user_email: userEmail,
      preferences: {
        [PillarType.HEALTH]: {
          preferred_time: "07:00",
          duration_minutes: 45,
          days_of_week: [1, 3, 5], // Tue, Thu, Sat
          reminder_before_minutes: 15,
        },
        [PillarType.FITNESS]: {
          preferred_time: "08:00",
          duration_minutes: 60,
          days_of_week: [0, 2, 4], // Mon, Wed, Fri
          reminder_before_minutes: 15,
        },
        [PillarType.NUTRITION]: {
          preferred_time: "12:00",
          duration_minutes: 30,
          days_of_week: [0, 1, 2, 3, 4, 5, 6], // Every day
          reminder_before_minutes: 15,
        },
        [PillarType.MENTAL]: {
          preferred_time: "18:00",
          duration_minutes: 30,
          days_of_week: [0, 2, 4, 6], // Mon, Wed, Fri, Sun
          reminder_before_minutes: 15,
        },
        [PillarType.PERSONAL]: {
          preferred_time: "20:00",
          duration_minutes: 45,
          days_of_week: [1, 3, 5], // Tue, Thu, Sat
          reminder_before_minutes: 15,
        },
      },
    };

    setGeneratingPlan(true);

    try {
      // Debug log
      console.log(`Generating plan for goal ${goalId}:`, goal);

      // Generate the plan (returns { actionPlan, weeklySchedule })
      const { actionPlan, weeklySchedule } = await goalsApi.generatePlan(
        goalId,
        userEmail,
        [defaultPreferences]
      );

      console.log("Plan generation response:", { actionPlan, weeklySchedule });

      // Defensive checks
      if (!actionPlan || !weeklySchedule) {
        throw new Error("Plan generation returned incomplete data");
      }

      // Debug logs
      console.log("Action plan:", actionPlan);
      console.log("Weekly schedule:", weeklySchedule);

      // Set the active plan for immediate UI feedback
      setActivePlan({
        actionPlan: actionPlan,
        weeklySchedule: weeklySchedule,
      });

      // Reload all goals so the specific goal reflects new action items
      try {
        await loadGoals();
      } catch (reloadErr) {
        console.warn("Goals reload after plan generation failed:", reloadErr);
      }

      // Success – we already set expectations above, so no extra modal needed
    } catch (error) {
      console.error("Error generating plan:", error);
      Alert.alert(
        isDarkMode ? "Error" : "Error",
        error instanceof Error ? error.message : "Failed to generate plan",
        undefined,
        {
          cancelable: true,
          userInterfaceStyle: isDarkMode ? "dark" : "light",
        }
      );
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleWeekChange = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeek);
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentWeek(newDate);

    // Load goals for the new week
    const { start } = getWeekDates(newDate);
    loadGoals(start.toISOString());
  };

  const handleSaveReflection = async (
    reflection: string,
    rating: number,
    nextWeekGoals: string[]
  ) => {
    try {
      const { start, end } = getWeekDates(currentWeek);
      await saveWeeklyReflection({
        week_start: start.toISOString(),
        week_end: end.toISOString(),
        rating,
        reflection,
        next_week_goals: nextWeekGoals,
      });
      setShowReflection(false);
      Alert.alert("Success", "Weekly reflection saved successfully");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save reflection"
      );
    }
  };

  const { start: weekStart, end: weekEnd } = getWeekDates(currentWeek);
  const completedGoals = goals.filter((goal) => goal.completed).length;
  const totalGoals = goals.length;
  const completionRate =
    totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  const { isDarkMode } = useTheme();

  if (loading && goals.length === 0) {
    return (
      <SafeAreaView className="flex-1">
        <LinearGradient
          colors={isDarkMode ? ["#111827", "#1f2937"] : ["#f0f9f6", "#e6f4f1"]}
          className="flex-1"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator
              size="large"
              color={isDarkMode ? "#34d399" : "#059669"}
            />
            <Text
              className={`mt-4 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Loading goals...
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={isDarkMode ? ["#111827", "#1f2937"] : ["#f0f9f6", "#e6f4f1"]}
        className="flex-1"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View
          className={`shadow-sm border-b px-4 py-4 ${
            isDarkMode
              ? "bg-gray-900 border-gray-800"
              : "bg-white border-gray-100"
          }`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: isDarkMode ? "#1f6f51" : "#114131" }}
              >
                <Target size={20} color="#fff" />
              </View>
              <View>
                <Text
                  className={`font-semibold ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  Weekly Goals
                </Text>
                <Text
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {formatDate(weekStart)} - {formatDate(weekEnd)}
                </Text>
              </View>
            </View>
            <View className="flex-row">
              <View className="items-center mr-3">
                <TouchableOpacity
                  onPress={openPreferences}
                  accessibilityLabel="Set Weekly Time Preferences"
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isDarkMode ? "#1f6f51" : "#114131",
                  }}
                >
                  <Star size={16} color="#fff" />
                </TouchableOpacity>
                <Text
                  className={`text-[10px] mt-1 text-center w-20 ${
                    isDarkMode ? "text-gray-300" : "text-gray-800"
                  }`}
                >
                  Set Weekly Time Preferences
                </Text>
              </View>
              <View className="items-center mr-3">
                <TouchableOpacity
                  onPress={() => setShowUploadModal(true)}
                  accessibilityLabel="Open File Manager"
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isDarkMode ? "#1f6f51" : "#114131",
                  }}
                >
                  <BookOpen size={16} color="#fff" />
                </TouchableOpacity>
                <Text
                  className={`text-[10px] ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  } mt-1 text-center w-20`}
                >
                  Open File Manager
                </Text>
              </View>
              <View className="items-center">
                <TouchableOpacity
                  onPress={() => setShowAddGoal(true)}
                  accessibilityLabel="Create New Goal"
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isDarkMode ? "#1f6f51" : "#114131",
                  }}
                >
                  <Plus size={16} color="#fff" />
                </TouchableOpacity>
                <Text
                  className={`text-[10px] ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  } mt-1 text-center w-20`}
                >
                  Create New Goal
                </Text>
              </View>
            </View>
          </View>
        </View>

        {error && (
          <View
            className={`mx-4 mt-4 p-3 rounded-lg border ${
              isDarkMode
                ? "bg-red-950/50 border-red-900"
                : "bg-red-50 border-red-200"
            }`}
          >
            <Text
              className={`text-sm ${
                isDarkMode ? "text-red-400" : "text-red-700"
              }`}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Upload Modal */}
        <Modal
          visible={showUploadModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUploadModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              className={`rounded-xl w-full max-w-md mx-4 p-5 ${
                isDarkMode ? "bg-gray-900" : "bg-white"
              }`}
              style={{ elevation: 20 }}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className={`text-lg font-semibold ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  Manage Documents
                </Text>
                <TouchableOpacity
                  onPress={() => setShowUploadModal(false)}
                  className="p-1"
                >
                  <X size={20} color={isDarkMode ? "#d1d5db" : "#6b7280"} />
                </TouchableOpacity>
              </View>

              {uploadProgress && (
                <View
                  className={`mb-4 border rounded-lg p-3 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700"
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <View className="flex-row items-center mb-2">
                    {uploadProgress.status === "processing" ? (
                      <ActivityIndicator
                        size="small"
                        color={isDarkMode ? "#34d399" : "#059669"}
                        style={{ marginRight: 8 }}
                      />
                    ) : uploadProgress.status === "completed" ? (
                      <CheckCircle
                        size={18}
                        color={isDarkMode ? "#34d399" : "#059669"}
                        style={{ marginRight: 8 }}
                      />
                    ) : (
                      <AlertCircle
                        size={18}
                        color={isDarkMode ? "#f87171" : "#ef4444"}
                        style={{ marginRight: 8 }}
                      />
                    )}
                    <Text
                      className={`font-medium text-sm ${
                        isDarkMode ? "text-gray-100" : "text-gray-800"
                      }`}
                    >
                      {uploadProgress.status === "processing"
                        ? "Processing Document"
                        : uploadProgress.status === "completed"
                        ? "Upload Complete"
                        : "Upload Failed"}
                    </Text>
                  </View>
                  <Text
                    className={`text-xs mb-2 ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    {uploadProgress.filename}
                  </Text>
                  <View
                    className={`h-2 rounded-full mb-2 overflow-hidden ${
                      isDarkMode ? "bg-gray-700" : "bg-gray-200"
                    }`}
                  >
                    <View
                      className="h-2"
                      style={{
                        width: `${uploadProgress.percentage}%`,
                        backgroundColor:
                          uploadProgress.status === "failed"
                            ? isDarkMode
                              ? "#f87171"
                              : "#ef4444"
                            : isDarkMode
                            ? "#34d399"
                            : "#059669",
                      }}
                    />
                  </View>
                  <Text
                    className={`text-xs ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    {uploadProgress.message}
                  </Text>
                  {uploadProgress.status === "completed" && (
                    <View
                      className={`mt-2 rounded-md p-2 ${
                        isDarkMode ? "bg-emerald-950/50" : "bg-green-50"
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          isDarkMode ? "text-emerald-300" : "text-green-800"
                        }`}
                      >
                        Extracted {uploadProgress.entitiesCount} entities &{" "}
                        {uploadProgress.relationshipsCount} relationships
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View className="mb-4 max-h-56">
                <Text
                  className={`text-sm font-medium mb-2 ${
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Uploaded Files
                </Text>
                {uploadedFiles.length === 0 && !uploadProgress && (
                  <View
                    className={`p-4 rounded-lg items-center ${
                      isDarkMode ? "bg-gray-800" : "bg-gray-50"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      No documents uploaded yet.
                    </Text>
                  </View>
                )}
                <ScrollView>
                  {uploadedFiles.map((file) => (
                    <View
                      key={file.name}
                      className={`flex-row items-center justify-between rounded-lg px-3 py-2 mb-2 ${
                        isDarkMode ? "bg-gray-800" : "bg-gray-50"
                      }`}
                    >
                      <View className="flex-1 mr-2">
                        <Text
                          className={`text-xs font-medium ${
                            isDarkMode ? "text-gray-100" : "text-gray-800"
                          }`}
                          numberOfLines={1}
                        >
                          {file.name}
                        </Text>
                        <Text
                          className={`text-[10px] ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {(file.size / 1024).toFixed(1)} KB · {file.type}
                        </Text>
                      </View>
                      <DeleteFileButton
                        onDelete={async () => {
                          try {
                            if (file.upload_id) {
                              await goalsApi.deleteUploadedFile(file.upload_id);
                            }
                            const files = await goalsApi.getUploadedFiles(
                              userEmail
                            );
                            setUploadedFiles(
                              files.map((f) => ({
                                id: f.id,
                                upload_id: f.upload_id,
                                name: f.filename,
                                type: f.extension,
                                size: f.size,
                                status: f.status,
                                entities_count: f.entities_count,
                                relationships_count: f.relationships_count,
                              }))
                            );
                          } catch (err) {
                            Alert.alert("Error", "Failed to delete file");
                            throw err; // Re-throw to trigger error state in button
                          }
                        }}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View className="flex-row justify-end space-x-3">
                <TouchableOpacity
                  onPress={() => setShowUploadModal(false)}
                  className={`px-4 py-2 rounded-lg ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-200"
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleFileUpload}
                  disabled={isUploading || generatingPlan}
                  className={`px-4 py-2 rounded-lg ${
                    isUploading
                      ? isDarkMode
                        ? "bg-emerald-900"
                        : "bg-emerald-300"
                      : isDarkMode
                      ? "bg-emerald-700"
                      : "bg-emerald-600"
                  }`}
                >
                  <Text className="text-sm font-medium text-white">
                    {isUploading ? "Uploading..." : "Upload Document"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Preferences Modal */}
        <Modal
          visible={showPreferencesModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPreferencesModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              className={`rounded-xl w-full max-w-md mx-4 p-5 ${
                isDarkMode ? "bg-gray-900" : "bg-white"
              }`}
              style={{ elevation: 20 }}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className={`text-lg font-semibold ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  Weekly Preferences
                </Text>
                <TouchableOpacity
                  onPress={() => setShowPreferencesModal(false)}
                  className="p-1"
                >
                  <X size={20} color={isDarkMode ? "#d1d5db" : "#6b7280"} />
                </TouchableOpacity>
              </View>

              {preferencesLoading ? (
                <View className="py-6 items-center">
                  <ActivityIndicator
                    color={isDarkMode ? "#34d399" : "#059669"}
                  />
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 420 }}>
                  {Object.values(PillarType).map((pillar) => (
                    <View
                      key={pillar}
                      className={`mb-4 p-3 rounded-lg border ${
                        isDarkMode
                          ? "border-gray-700 bg-gray-800"
                          : "border-gray-100 bg-gray-50"
                      }`}
                    >
                      <Text
                        className={`font-semibold mb-2 ${
                          isDarkMode ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        {pillar}
                      </Text>
                      <View className="flex-row mb-2">
                        <View className="flex-1 mr-2">
                          <Text
                            className={`text-xs mb-1 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            Preferred Time (HH:mm)
                          </Text>
                          <TextInput
                            className={`border rounded px-2 py-1 ${
                              isDarkMode
                                ? "bg-gray-900 border-gray-700 text-gray-100"
                                : "bg-white border-gray-300 text-gray-800"
                            }`}
                            value={
                              timePreferences[pillar]?.preferred_time || ""
                            }
                            onChangeText={(t) =>
                              updatePrefField(pillar, "preferred_time", t)
                            }
                            placeholder="07:00"
                            placeholderTextColor={
                              isDarkMode ? "#9ca3af" : undefined
                            }
                          />
                        </View>
                        <View className="w-28">
                          <Text
                            className={`text-xs mb-1 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            Duration (min)
                          </Text>
                          <TextInput
                            className={`border rounded px-2 py-1 ${
                              isDarkMode
                                ? "bg-gray-900 border-gray-700 text-gray-100"
                                : "bg-white border-gray-300 text-gray-800"
                            }`}
                            keyboardType="numeric"
                            value={String(
                              timePreferences[pillar]?.duration_minutes ?? 30
                            )}
                            onChangeText={(t) =>
                              updatePrefField(
                                pillar,
                                "duration_minutes",
                                parseInt(t || "0")
                              )
                            }
                            placeholder="30"
                            placeholderTextColor={
                              isDarkMode ? "#9ca3af" : undefined
                            }
                          />
                        </View>
                      </View>

                      <View className="flex-row mb-2">
                        <View className="w-40">
                          <Text
                            className={`text-xs mb-1 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            Reminder (min)
                          </Text>
                          <TextInput
                            className={`border rounded px-2 py-1 ${
                              isDarkMode
                                ? "bg-gray-900 border-gray-700 text-gray-100"
                                : "bg-white border-gray-300 text-gray-800"
                            }`}
                            keyboardType="numeric"
                            value={String(
                              timePreferences[pillar]
                                ?.reminder_before_minutes ?? 10
                            )}
                            onChangeText={(t) =>
                              updatePrefField(
                                pillar,
                                "reminder_before_minutes",
                                parseInt(t || "0")
                              )
                            }
                            placeholder="10"
                            placeholderTextColor={
                              isDarkMode ? "#9ca3af" : undefined
                            }
                          />
                        </View>
                      </View>

                      <Text
                        className={`text-xs mb-1 ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Days of Week
                      </Text>
                      <View className="flex-row">
                        {["S", "M", "T", "W", "T", "F", "S"].map(
                          (label, idx) => {
                            const active = (
                              timePreferences[pillar]?.days_of_week || []
                            ).includes(idx);
                            return (
                              <TouchableOpacity
                                key={`${pillar}-${idx}`}
                                onPress={() => toggleDay(pillar, idx)}
                                className={`mr-2 px-2 py-1 rounded ${
                                  active
                                    ? isDarkMode
                                      ? "bg-emerald-700"
                                      : "bg-emerald-600"
                                    : isDarkMode
                                    ? "bg-gray-700"
                                    : "bg-gray-200"
                                }`}
                              >
                                <Text
                                  className={`text-xs ${
                                    active
                                      ? "text-white"
                                      : isDarkMode
                                      ? "text-gray-200"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {label}
                                </Text>
                              </TouchableOpacity>
                            );
                          }
                        )}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}

              <View className="flex-row justify-end mt-3">
                <TouchableOpacity
                  onPress={() => setShowPreferencesModal(false)}
                  className={`px-4 py-2 rounded-lg ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-200"
                  } mr-2`}
                >
                  <Text
                    className={`text-sm ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={preferencesLoading}
                  onPress={savePreferences}
                  className={`px-4 py-2 rounded-lg ${
                    preferencesLoading
                      ? isDarkMode
                        ? "bg-emerald-900"
                        : "bg-emerald-300"
                      : isDarkMode
                      ? "bg-emerald-700"
                      : "bg-emerald-600"
                  }`}
                >
                  <Text className="text-sm font-medium text-white">Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ScrollView contentContainerClassName="pb-8" className="flex-1">
          <GeneratingBanner />
          <View className="px-4 space-y-6 mt-4">
            {/* Week Navigation (hidden) */}
            {false && (
              <Card className="border-0">
                <View className="flex-row items-center justify-between p-4">
                  <TouchableOpacity
                    onPress={() => handleWeekChange("prev")}
                    className="p-2"
                  >
                    <ChevronLeft size={20} color="#059669" />
                  </TouchableOpacity>
                  <View className="items-center">
                    <Text className="font-semibold text-gray-800">
                      Week of {formatDate(weekStart)}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {completedGoals}/{totalGoals} goals completed
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleWeekChange("next")}
                    className="p-2"
                  >
                    <ChevronRight size={20} color="#059669" />
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            {/* Progress Overview (hidden) */}
            {false && (
              <Card className="border-0">
                <View className="p-4">
                  <View className="flex-row items-center mb-3">
                    <BarChart3 size={20} color="#059669" className="mr-2" />
                    <Text className="text-lg font-semibold text-gray-800">
                      Weekly Progress
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm text-gray-600">
                      Completion Rate
                    </Text>
                    <Text className="text-sm font-semibold text-gray-800">
                      {completionRate.toFixed(0)}%
                    </Text>
                  </View>
                  <View className="h-3 bg-gray-200 rounded-full">
                    <View
                      className="h-3 rounded-full"
                      style={{
                        backgroundColor: "#114131",
                        width: `${completionRate}%`,
                      }}
                    />
                  </View>
                  <View className="flex-row justify-between mt-3">
                    <View className="items-center">
                      <Text
                        className="text-2xl font-bold"
                        style={{ color: "#114131" }}
                      ></Text>
                      <Text className="text-xs text-gray-600">Completed</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-2xl font-bold text-gray-400"></Text>
                      <Text className="text-xs text-gray-600">Remaining</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-2xl font-bold text-blue-600"></Text>
                      <Text className="text-xs text-gray-600">Total</Text>
                    </View>
                  </View>
                </View>
              </Card>
            )}

            {/* Goals Summary (hidden) */}
            {false && goals && goals.length > 0 && (
              <WeeklyGoalsSummary
                goals={goals.map((goal) => ({
                  id: goal.id,
                  title: goal.title,
                  currentValue: goal.current_value || 0,
                  targetValue: goal.target_value || 1,
                  completed: goal.completed,
                  category: goal.category,
                }))}
                onViewAll={() => {
                  // Scroll to goals list or show all goals
                  console.log("View all goals");
                }}
              />
            )}

            {/* Goals List */}
            {goals.map((goal: ExtendedGoal) => (
              <Card
                key={goal.id}
                className={`border-0 ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <View className="p-4">
                  <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <Text className="text-lg mr-2">
                          {getCategoryIcon(goal.category)}
                        </Text>
                        <Text
                          className={`text-lg font-semibold ${
                            isDarkMode ? "text-gray-100" : "text-gray-800"
                          }`}
                        >
                          {goal.title}
                        </Text>
                      </View>
                      {!goal.action_plan && (
                        <TouchableOpacity
                          onPress={() => handleGeneratePlan(goal.id, goal)}
                          disabled={generatingPlan}
                          className={`px-3 py-1.5 bg-emerald-600 rounded-lg flex-row items-center ${
                            generatingPlan ? "opacity-50" : ""
                          }`}
                        >
                          {generatingPlan ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <BarChart3
                              size={16}
                              color="#ffffff"
                              className="mr-1"
                            />
                          )}
                          <Text className="text-white text-sm font-medium ml-2">
                            {generatingPlan ? "Generating…" : "Generate Plan"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text
                      className={`text-sm mb-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      {goal.description}
                    </Text>
                    <View className="flex-row items-center">
                      <Text
                        className={`text-xs font-medium ${getPriorityColor(
                          goal.priority
                        )}`}
                      >
                        {goal.priority.toUpperCase()} PRIORITY
                      </Text>
                    </View>
                  </View>

                  {/* Action Items */}
                  {(goal.action_plan?.action_items?.length ?? 0) > 0 && (
                    <View className="mt-4">
                      <Text
                        className={`text-lg font-semibold mb-2 ${
                          isDarkMode ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        Action Items
                      </Text>
                      <View>
                        {goal.action_plan?.action_items?.map((item) => (
                          <ActionItemCard
                            key={item.title}
                            item={item}
                            onPress={() => setSelectedActionItem(item)}
                          />
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Use GoalProgressTracker component for measurable goals */}
                  {goal.target_value && (
                    <GoalProgressTracker
                      goalId={goal.id}
                      title=""
                      currentValue={goal.current_value || 0}
                      targetValue={goal.target_value}
                      unit={goal.unit || ""}
                      onProgressUpdate={handleUpdateProgress}
                      showQuickActions={true}
                    />
                  )}
                </View>
              </Card>
            ))}

            {/* Weekend Reflection */}
            {new Date().getDay() === 0 && ( // Sunday
              <Card className="border-0 bg-blue-50">
                <View className="p-4">
                  <View className="flex-row items-center mb-3">
                    <BookOpen size={20} color="#3b82f6" className="mr-2" />
                    <Text className="text-lg font-semibold text-blue-800">
                      Weekly Reflection
                    </Text>
                  </View>
                  <Text className="text-sm text-blue-700 mb-3">
                    Take a moment to reflect on your week and plan for the next
                    one.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowReflection(true)}
                    className="bg-blue-600 px-4 py-2 rounded-lg self-start"
                  >
                    <Text className="text-white font-medium">
                      Start Reflection
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            {/* Habit Integration (hidden) */}
            {false && goals.length > 0 && (
              <HabitGoalIntegration
                goalId={goals[0].id}
                goalTitle={goals[0].title}
                suggestedHabits={[
                  "Set a daily reminder",
                  "Track progress in the morning",
                  "Review goals before bed",
                  "Celebrate small wins",
                ]}
                completedHabits={["Set a daily reminder"]}
                onHabitToggle={(habit) => {
                  // Handle habit toggle
                  console.log("Habit toggled:", habit);
                }}
              />
            )}

            {/* Quick Actions */}
            <Card
              className={`border-0 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
            >
              <View className="p-4">
                <Text
                  className={`text-lg font-semibold mb-3 ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  Quick Actions
                </Text>
                <View className="space-y-2">
                  <TouchableOpacity
                    className={`flex-row items-center p-3 rounded-lg ${
                      isDarkMode ? "bg-gray-700" : "bg-gray-50"
                    }`}
                  >
                    <Calendar
                      size={20}
                      color={isDarkMode ? "#34d399" : "#059669"}
                      className="mr-3"
                    />
                    <Text
                      className={`flex-1 ${
                        isDarkMode ? "text-gray-100" : "text-gray-800"
                      }`}
                    >
                      View Monthly Overview
                    </Text>
                    <ArrowRight
                      size={16}
                      color={isDarkMode ? "#a1a1aa" : "#64748b"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-row items-center p-3 rounded-lg ${
                      isDarkMode ? "bg-gray-700" : "bg-gray-50"
                    }`}
                  >
                    <TrendingUp
                      size={20}
                      color={isDarkMode ? "#34d399" : "#059669"}
                      className="mr-3"
                    />
                    <Text
                      className={`flex-1 ${
                        isDarkMode ? "text-gray-100" : "text-gray-800"
                      }`}
                    >
                      Progress Analytics
                    </Text>
                    <ArrowRight
                      size={16}
                      color={isDarkMode ? "#a1a1aa" : "#64748b"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-row items-center p-3 rounded-lg ${
                      isDarkMode ? "bg-gray-700" : "bg-gray-50"
                    }`}
                  >
                    <Star
                      size={20}
                      color={isDarkMode ? "#34d399" : "#059669"}
                      className="mr-3"
                    />
                    <Text
                      className={`flex-1 ${
                        isDarkMode ? "text-gray-100" : "text-gray-800"
                      }`}
                    >
                      Achievement Badges
                    </Text>
                    <ArrowRight
                      size={16}
                      color={isDarkMode ? "#a1a1aa" : "#64748b"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          </View>
        </ScrollView>

        {/* Add Goal Modal */}
        {showAddGoal && (
          <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center">
            <View
              className={`rounded-lg p-6 m-4 w-full max-w-sm ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <Text
                className={`text-xl font-semibold mb-4 ${
                  isDarkMode ? "text-gray-100" : "text-gray-800"
                }`}
              >
                Add New Goal
              </Text>

              <TextInput
                placeholder="Goal title"
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
                }
                className={`rounded-lg px-3 py-2 mb-3 border ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-gray-100"
                    : "bg-white border-gray-300 text-gray-800"
                }`}
                placeholderTextColor={isDarkMode ? "#9ca3af" : undefined}
              />

              <TextInput
                placeholder="Description (optional)"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                className={`rounded-lg px-3 py-2 mb-3 border ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-gray-100"
                    : "bg-white border-gray-300 text-gray-800"
                }`}
                placeholderTextColor={isDarkMode ? "#9ca3af" : undefined}
                multiline
              />

              {/* Show Suggestions Button */}
              <TouchableOpacity
                onPress={() => setShowSuggestions(!showSuggestions)}
                className={`mb-3 p-2 rounded-lg ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-sm text-center ${
                    isDarkMode ? "text-gray-200" : "text-gray-600"
                  }`}
                >
                  {showSuggestions ? "Hide Suggestions" : "Show Suggestions"}
                </Text>
              </TouchableOpacity>

              {/* Goal Suggestions */}
              {showSuggestions && (
                <View className="mb-4">
                  <Text
                    className={`text-sm font-medium mb-2 ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    SUGGESTIONS
                  </Text>
                  <View className="space-y-2">
                    {[
                      "Sleep 8 hours a day",
                      "Follow recommended diet",
                      "Exercise 4 times a week for 75 min each",
                      "Meditate for 20 min daily",
                      "Connect with social group twice a week after work",
                    ].map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          setFormData({ ...formData, title: suggestion });
                        }}
                        className={`border rounded-lg p-3 ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            isDarkMode ? "text-gray-200" : "text-gray-700"
                          }`}
                        >
                          {suggestion}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View className="flex-row justify-between mb-3">
                <Text
                  className={`text-sm font-medium ${
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Priority:
                </Text>
                <View className="flex-row">
                  {(["low", "medium", "high"] as const).map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      onPress={() => setFormData({ ...formData, priority })}
                      className={`px-3 py-1 rounded mr-1 ${
                        formData.priority === priority
                          ? isDarkMode
                            ? "bg-emerald-700"
                            : "bg-emerald-900"
                          : isDarkMode
                          ? "bg-gray-700"
                          : "bg-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          formData.priority === priority
                            ? "text-white"
                            : isDarkMode
                            ? "text-gray-200"
                            : "text-gray-700"
                        }`}
                      >
                        {priority.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="flex-row justify-between mb-3">
                <Text
                  className={`text-sm font-medium ${
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Category:
                </Text>
                <View className="flex-row">
                  {(
                    [
                      "health",
                      "fitness",
                      "nutrition",
                      "mental",
                      "personal",
                    ] as const
                  ).map((category) => (
                    <TouchableOpacity
                      key={category}
                      onPress={() => setFormData({ ...formData, category })}
                      className={`px-2 py-1 rounded mr-1 ${
                        formData.category === category
                          ? isDarkMode
                            ? "bg-emerald-700"
                            : "bg-emerald-900"
                          : isDarkMode
                          ? "bg-gray-700"
                          : "bg-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          formData.category === category
                            ? "text-white"
                            : isDarkMode
                            ? "text-gray-200"
                            : "text-gray-700"
                        }`}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => {
                    setShowAddGoal(false);
                    setShowSuggestions(false);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg mr-2 ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-300"
                  }`}
                >
                  <Text
                    className={`text-center ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddGoal}
                  className="flex-1 px-4 py-2 rounded-lg ml-2"
                  style={{
                    backgroundColor: isDarkMode ? "#059669" : "#114131",
                  }}
                >
                  <Text className="text-center text-white">Add Goal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Weekly Reflection Modal */}
        {showReflection && (
          <WeeklyReflection
            weekStart={weekStart}
            weekEnd={weekEnd}
            completedGoals={completedGoals}
            totalGoals={totalGoals}
            onSave={handleSaveReflection}
            onClose={() => setShowReflection(false)}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Action Item Schedule Modal */}
        {selectedActionItem && (
          <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center">
            <View className="bg-white rounded-lg p-6 m-4 w-full max-w-sm">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-semibold text-gray-800">
                  {selectedActionItem?.title}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedActionItem(null)}
                  className="p-2"
                >
                  <X size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <Text className="text-gray-600 mb-4">
                {selectedActionItem?.description}
              </Text>

              <Text className="font-semibold text-gray-800 mb-2">
                Weekly Schedule
              </Text>
              <ScrollView className="max-h-80">
                {Object.entries(selectedActionItem?.weekly_schedule || {}).map(
                  ([day, schedule]: [string, any]) =>
                    schedule &&
                    schedule.time_slots &&
                    schedule.time_slots.length > 0 ? (
                      <View key={day} className="mb-3">
                        <Text className="font-medium text-gray-700 mb-1">
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </Text>
                        {schedule.time_slots.map((slot: any, index: number) => (
                          <View
                            key={index}
                            className="ml-4 mb-1 bg-gray-50 p-2 rounded"
                          >
                            <Text className="text-sm text-gray-600">
                              {slot.start_time} - {slot.end_time}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              Duration: {slot.duration}
                            </Text>
                            {slot.health_notes &&
                              slot.health_notes.length > 0 && (
                                <Text className="text-xs text-gray-500 mt-1 italic">
                                  Note: {slot.health_notes[0]}
                                </Text>
                              )}
                          </View>
                        ))}
                      </View>
                    ) : null
                )}
              </ScrollView>

              <TouchableOpacity
                onPress={() => setSelectedActionItem(null)}
                className="mt-4 bg-emerald-600 px-4 py-2 rounded-lg"
              >
                <Text className="text-center text-white">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}
