import { CircularProgressRing } from '@/components/CircularProgressRing';
import GoalProgressTracker from '@/components/GoalProgressTracker';
import HabitGoalIntegration from '@/components/HabitGoalIntegration';
import Card from '@/components/ui/card';
import WeeklyGoalsSummary from '@/components/WeeklyGoalsSummary';
import WeeklyReflection from '@/components/WeeklyReflection';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useActionCompletions } from '@/hooks/useActionCompletions';
import { useGoals } from '@/hooks/useGoals';
import { goalsApi } from '@/services/goalsApi';
import { ActionPlan, Goal, GoalCategory, GoalPriority } from '@/types/goals';
import { PillarTimePreferences, PillarType, TimePreference } from '@/types/preferences';
import * as DocumentPicker from 'expo-document-picker';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Star,
  Target,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
          time_slots: {
            start_time: string;
            end_time: string;
            duration: string;
            pillar: string;
            action_item: string;
            frequency: string | null;
            priority: string | null;
            health_notes: string[];
          }[];
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
      className={`rounded px-2 py-1 ${
        isLoading ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-100') : isDarkMode ? 'bg-red-900/50' : 'bg-red-100'
      }`}
    >
      {isLoading ? (
        <ActivityIndicator size='small' color={isDarkMode ? '#f87171' : '#dc2626'} />
      ) : (
        <Text className={`text-[10px] font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>Delete</Text>
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
      ([key, value]: [string, any]) =>
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(key) &&
        value &&
        value.time_slots &&
        value.time_slots.length > 0
    )
    .map(([day]) => day);

  return (
    <TouchableOpacity className='mt-3' onPress={onPress}>
      <View className={`rounded-lg p-4 shadow ${isDarkMode ? 'border border-gray-700 bg-gray-800' : 'bg-white'}`}>
        <Text className={`mb-1 text-base font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          {item.title}
        </Text>
        <Text className={`mb-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.description}</Text>
        {scheduledDays.length > 0 && (
          <View className='mt-1 flex-row flex-wrap'>
            {scheduledDays.map((day) => (
              <View key={day} className={`mb-1 mr-1 rounded px-2 py-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <Text className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
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
  weekly_completion?: {
    week_start: string;
    is_complete: boolean;
  }[];
  weekly_schedule?: any; // Using any for now to avoid complex type definitions
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
        time_slots: {
          start_time: string;
          end_time: string;
          duration: string;
          pillar: string;
          action_item: string;
          frequency: string | null;
          priority: string | null;
          health_notes: string[];
        }[];
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

export default function GoalsScreen() {
  const { user } = useAuth();
  const userEmail = user?.email || '';
  const userName = user?.name || '';

  // Action completions hook for tracking completion percentages
  const {
    completionStats,
    getGoalCompletionPercentage,
    markCompletion,
    loading: completionLoading,
  } = useActionCompletions(userEmail);

  useEffect(() => {
    console.log('Current user context:', {
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
  const [selectedActionItem, setSelectedActionItem] = useState<ActionItem | null>(null);
  const [activePlan, setActivePlan] = useState<{
    actionPlan: ActionPlan;
    weeklySchedule: any;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    uploadId: string;
    filename: string;
    percentage: number;
    message: string;
    status: 'processing' | 'completed' | 'failed';
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
    title: '',
    description: '',
    priority: 'medium' as GoalPriority,
    category: 'health' as GoalCategory,
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'health':
        return '❤️';
      case 'fitness':
        return '💪';
      case 'nutrition':
        return '🥗';
      case 'mental':
        return '🧠';
      case 'personal':
        return '⭐';
      default:
        return '🎯';
    }
  };

  const getProgressPercentage = (goal: Goal) => {
    if (!goal.target_value || !goal.current_value) return 0;
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const handleAddGoal = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a goal title');
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
        title: '',
        description: '',
        priority: 'medium',
        category: 'health',
        dueDate: new Date(),
      });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create goal');
    }
  };

  const handleUpdateProgress = async (goalId: string, newValue: number) => {
    try {
      await updateGoalProgress(goalId, newValue);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update progress');
    }
  };

  const handleToggleComplete = async (goalId: string) => {
    try {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;

      await updateGoal(goalId, { completed: !goal.completed });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update goal');
    }
  };

  const handleAddNote = async (goalId: string, note: string) => {
    if (!note.trim()) return;

    try {
      await addGoalNote(goalId, note);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add note');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'text/plain',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        return file;
      }
      return null;
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
      return null;
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null);
  const [uploadingUploadId, setUploadingUploadId] = useState<string | null>(null);
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
  const uploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dedupeFiles = (files: typeof uploadedFiles) => {
    const map = new Map<string, any>();
    files.forEach((f) => map.set(f.upload_id || f.id || f.name, f));
    return Array.from(map.values());
  };

  // Using goalsApi for file upload operations
  const uploadFileToServer = async (file: DocumentPicker.DocumentPickerAsset) => {
    try {
      if (!userEmail) {
        console.error('User email missing. Context:', { userEmail, user });
        throw new Error('User email is required for document upload');
      }

      // For all uploads, pass the file info and userEmail
      return await goalsApi.uploadDocument(
        file.file || {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        },
        userEmail
      );
    } catch (error) {
      console.error('Upload error details:', error);
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
        console.warn('Failed to load uploaded files', err);
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
      console.error('Progress monitoring error:', error);
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
        Alert.alert('Upload in Progress', 'This file is already being uploaded. Please wait for it to complete.');
        return;
      }

      // Check if file is already uploaded
      if (uploadedFiles.some((f) => f.name === file.name)) {
        Alert.alert('File Already Uploaded', 'This file has already been uploaded.');
        return;
      }

      // Test if backend is reachable
      const isBackendReachable = await goalsApi.testBackendConnection();
      if (!isBackendReachable) {
        console.error('Backend not reachable');
        Alert.alert(
          'Connection Error',
          'Cannot connect to the backend server. Please make sure the API server is running.'
        );
        return;
      }

      // Step 2: Start upload process
      setIsUploading(true);
      setUploadingFileId(file.name);
      setUploadingUploadId('temp-id');
      setUploadProgress({
        uploadId: 'temp-id',
        filename: file.name,
        percentage: 5,
        message: 'Preparing file for upload...',
        status: 'processing',
        entitiesCount: 0,
        relationshipsCount: 0,
      });

      // Step 3: Simulate file preparation
      await new Promise((resolve) => setTimeout(resolve, 500));
      setUploadProgress((prev) => (prev ? { ...prev, message: 'Reading file content...', percentage: 10 } : null));

      // Step 4: Upload file to server
      await new Promise((resolve) => setTimeout(resolve, 300));
      setUploadProgress((prev) => (prev ? { ...prev, message: 'Uploading file to server...', percentage: 15 } : null));

      const { upload_id } = await uploadFileToServer(file);

      setUploadingUploadId(upload_id);
      setUploadProgress((prev) =>
        prev
          ? {
              ...prev,
              uploadId: upload_id,
              message: 'File uploaded successfully, starting analysis...',
              percentage: 25,
            }
          : null
      );

      // Step 5: Monitor progress with enhanced messaging
      if (uploadMonitorActiveRef.current) {
        console.log('Upload monitor already active, skipping new interval');
        return;
      }
      uploadMonitorActiveRef.current = true;
      const progressInterval = setInterval(async () => {
        try {
          const progress = await monitorUploadProgress(upload_id);

          // Enhanced progress messages based on percentage
          let enhancedMessage = progress.message;
          if (progress.percentage <= 30) {
            enhancedMessage = 'Extracting text from document...';
          } else if (progress.percentage <= 50) {
            enhancedMessage = 'Analyzing document structure...';
          } else if (progress.percentage <= 70) {
            enhancedMessage = 'Identifying medical entities...';
          } else if (progress.percentage <= 90) {
            enhancedMessage = 'Extracting relationships and connections...';
          } else if (progress.percentage < 100) {
            enhancedMessage = 'Finalizing analysis...';
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
          if (progress.status === 'completed' || progress.status === 'failed') {
            clearInterval(progressInterval);
            setIsUploading(false);
            setUploadingFileId(null);
            setUploadingUploadId(null);
            uploadMonitorActiveRef.current = false;

            if (progress.status === 'completed') {
              // Show completion message briefly
              setUploadProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      message: 'Analysis complete! Document processed successfully.',
                      percentage: 100,
                    }
                  : null
              );

              // Refresh uploaded files list from backend
              try {
                if (!userEmail) {
                  console.warn('User email is undefined, skipping file refresh');
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
                console.warn('Failed to refresh uploaded files', err);
              }

              Alert.alert('Success', 'Document uploaded and analyzed successfully!');
            } else {
              Alert.alert('Error', 'Document processing failed. Please try again.');
            }

            // Clear progress after a delay
            setTimeout(() => {
              setUploadProgress(null);
            }, 3000);
          }
        } catch (error) {
          console.error('Progress monitoring error:', error);
          clearInterval(progressInterval);
          setIsUploading(false);
          setUploadingFileId(null);
          setUploadingUploadId(null);
          setUploadProgress(null);
          uploadMonitorActiveRef.current = false;
          Alert.alert('Error', 'Failed to monitor upload progress. Please try again.');
        }
      }, 1000); // Check progress every second
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setUploadingFileId(null);
      setUploadingUploadId(null);
      setUploadProgress(null);
      Alert.alert(
        'Error',
        `Upload failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }. Please check if the backend server is running and try again.`
      );
    }
  };

  // Preferences state
  const emptyPref: TimePreference = {
    preferred_time: '07:00',
    duration_minutes: 30,
    days_of_week: [1, 3, 5],
    reminder_before_minutes: 10,
  } as TimePreference;
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [timePreferences, setTimePreferences] = useState<Record<string, TimePreference>>({
    [PillarType.HEALTH]: { ...emptyPref },
    [PillarType.FITNESS]: { ...emptyPref, preferred_time: '08:00' },
    [PillarType.NUTRITION]: {
      ...emptyPref,
      preferred_time: '12:00',
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
    },
    [PillarType.MENTAL]: { ...emptyPref, preferred_time: '18:00' },
    [PillarType.PERSONAL]: { ...emptyPref, preferred_time: '20:00' },
  });

  // Inline banner to inform user while plan is being generated
  const GeneratingBanner = () =>
    generatingPlan ? (
      <View
        className={`mx-4 mb-1 mt-3 flex-row items-center rounded-lg border px-3 py-2 ${
          isDarkMode ? 'border-emerald-900 bg-emerald-950/50' : 'border-emerald-200 bg-emerald-50'
        }`}
      >
        <ActivityIndicator size='small' color={isDarkMode ? '#34d399' : '#059669'} />
        <Text className={`ml-2 text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>
          Generating plan… You can come back later once it is ready, as creating a detailed plan may take a while.
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
      console.warn('Failed to load preferences', e);
    } finally {
      setPreferencesLoading(false);
    }
  };

  const updatePrefField = (pillar: PillarType, field: keyof TimePreference, value: any) => {
    setTimePreferences((prev) => ({
      ...prev,
      [pillar]: { ...(prev[pillar] || emptyPref), [field]: value },
    }));
  };

  const toggleDay = (pillar: PillarType, day: number) => {
    setTimePreferences((prev) => {
      const p = prev[pillar] || emptyPref;
      const exists = p.days_of_week.includes(day);
      const days = exists ? p.days_of_week.filter((d: number) => d !== day) : [...p.days_of_week, day];
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
      Alert.alert('Success', 'Preferences saved');
      setShowPreferencesModal(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save preferences');
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
          preferred_time: '07:00',
          duration_minutes: 45,
          days_of_week: [1, 3, 5], // Tue, Thu, Sat
          reminder_before_minutes: 15,
        },
        [PillarType.FITNESS]: {
          preferred_time: '08:00',
          duration_minutes: 60,
          days_of_week: [0, 2, 4], // Mon, Wed, Fri
          reminder_before_minutes: 15,
        },
        [PillarType.NUTRITION]: {
          preferred_time: '12:00',
          duration_minutes: 30,
          days_of_week: [0, 1, 2, 3, 4, 5, 6], // Every day
          reminder_before_minutes: 15,
        },
        [PillarType.MENTAL]: {
          preferred_time: '18:00',
          duration_minutes: 30,
          days_of_week: [0, 2, 4, 6], // Mon, Wed, Fri, Sun
          reminder_before_minutes: 15,
        },
        [PillarType.PERSONAL]: {
          preferred_time: '20:00',
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
      const { actionPlan, weeklySchedule } = await goalsApi.generatePlan(goalId, userEmail, [defaultPreferences]);

      console.log('Plan generation response:', { actionPlan, weeklySchedule });

      // Defensive checks
      if (!actionPlan || !weeklySchedule) {
        throw new Error('Plan generation returned incomplete data');
      }

      // Debug logs
      console.log('Action plan:', actionPlan);
      console.log('Weekly schedule:', weeklySchedule);

      // Set the active plan for immediate UI feedback
      setActivePlan({
        actionPlan: actionPlan,
        weeklySchedule: weeklySchedule,
      });

      // Reload all goals so the specific goal reflects new action items
      try {
        await loadGoals();
      } catch (reloadErr) {
        console.warn('Goals reload after plan generation failed:', reloadErr);
      }

      // Success – we already set expectations above, so no extra modal needed
    } catch (error) {
      console.error('Error generating plan:', error);
      Alert.alert(
        isDarkMode ? 'Error' : 'Error',
        error instanceof Error ? error.message : 'Failed to generate plan',
        undefined,
        {
          cancelable: true,
          userInterfaceStyle: isDarkMode ? 'dark' : 'light',
        }
      );
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentWeek(newDate);

    // Load goals for the new week
    const { start } = getWeekDates(newDate);
    loadGoals(start.toISOString());
  };

  const handleSaveReflection = async (reflection: string, rating: number, nextWeekGoals: string[]) => {
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
      Alert.alert('Success', 'Weekly reflection saved successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save reflection');
    }
  };

  const { start: weekStart, end: weekEnd } = getWeekDates(currentWeek);
  const completedGoals = goals.filter((goal) => goal.completed).length;
  const totalGoals = goals.length;
  const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  const { isDarkMode } = useTheme();

  // Enhanced skeleton loading component with shimmer effect
  const SkeletonGoalCard = () => (
    <View
      style={{
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.3 : 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      {/* Header skeleton */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
              marginRight: 8,
            }}
          />
          <View
            style={{
              width: 180,
              height: 18,
              borderRadius: 4,
              backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
            }}
          />
        </View>
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 27,
            backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
          }}
        />
      </View>

      {/* Description skeleton */}
      <View
        style={{
          width: '90%',
          height: 14,
          borderRadius: 4,
          backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
          marginBottom: 8,
        }}
      />
      <View
        style={{
          width: '70%',
          height: 14,
          borderRadius: 4,
          backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
          marginBottom: 12,
        }}
      />

      {/* Priority skeleton */}
      <View
        style={{
          width: 100,
          height: 12,
          borderRadius: 4,
          backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
        }}
      />
    </View>
  );

  // Enhanced loading screen component
  const LoadingScreen = () => (
    <SafeAreaView>
      {/* Fixed Header */}
      <View>
        <View
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDarkMode ? 0.3 : 0.1,
            shadowRadius: 4,
            elevation: 3,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  backgroundColor: isDarkMode ? '#1f6f51' : '#114131',
                }}
              >
                <Target size={22} color='#fff' />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: isDarkMode ? '#f3f4f6' : '#1f2937',
                    marginBottom: 2,
                  }}
                >
                  Weekly Goals
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                  }}
                >
                  {formatDate(weekStart)} - {formatDate(weekEnd)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={openPreferences}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#1f6f51' : '#114131',
                  marginRight: 8,
                }}
                activeOpacity={0.7}
              >
                <Star size={18} color='#fff' />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowUploadModal(true)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#1f6f51' : '#114131',
                  marginRight: 8,
                }}
                activeOpacity={0.7}
              >
                <BookOpen size={18} color='#fff' />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowAddGoal(true)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#1f6f51' : '#114131',
                }}
                activeOpacity={0.7}
              >
                <Plus size={18} color='#fff' />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={{ height: '100%', backgroundColor: isDarkMode ? '#111827' : '#F0FDF4' }}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
            {/* Skeleton cards only - no loading card to prevent height issues */}
            <SkeletonGoalCard />
            <SkeletonGoalCard />
            <SkeletonGoalCard />
            <SkeletonGoalCard />
            <SkeletonGoalCard />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );

  // Show enhanced loading screen while initial load
  if (loading && goals.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView>
      {/* Fixed Header */}
      <View>
        {/* Header */}
        <View
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDarkMode ? 0.3 : 0.1,
            shadowRadius: 4,
            elevation: 3,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  backgroundColor: isDarkMode ? '#1f6f51' : '#114131',
                }}
              >
                <Target size={22} color='#fff' />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: isDarkMode ? '#f3f4f6' : '#1f2937',
                    marginBottom: 2,
                  }}
                >
                  Weekly Goals
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                  }}
                >
                  {formatDate(weekStart)} - {formatDate(weekEnd)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={openPreferences}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#1f6f51' : '#114131',
                  marginRight: 8,
                }}
                activeOpacity={0.7}
              >
                <Star size={18} color='#fff' />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowUploadModal(true)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#1f6f51' : '#114131',
                  marginRight: 8,
                }}
                activeOpacity={0.7}
              >
                <BookOpen size={18} color='#fff' />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowAddGoal(true)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#1f6f51' : '#114131',
                }}
                activeOpacity={0.7}
              >
                <Plus size={18} color='#fff' />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {error && (
          <View
            className={`mx-4 mt-4 rounded-lg border p-3 ${
              isDarkMode ? 'border-red-900 bg-red-950/50' : 'border-red-200 bg-red-50'
            }`}
          >
            <Text className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>{error}</Text>
          </View>
        )}

        {/* Upload Modal */}
        <Modal
          visible={showUploadModal}
          transparent
          animationType='fade'
          onRequestClose={() => setShowUploadModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'center',
              paddingHorizontal: 16,
              alignItems: 'center',
            }}
          >
            <View
              className={`mx-4 w-full max-w-md rounded-xl p-5 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
              style={{ elevation: 20 }}
            >
              <View className='mb-4 flex-row items-center justify-between'>
                <Text className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                  Manage Documents
                </Text>
                <TouchableOpacity onPress={() => setShowUploadModal(false)} className='p-1'>
                  <X size={20} color={isDarkMode ? '#d1d5db' : '#6b7280'} />
                </TouchableOpacity>
              </View>

              {/* Note: Only PDF files can be uploaded */}
              <View className='mb-3'>
                <Text className={`text-xs ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                  Only PDF files can be uploaded.
                </Text>
              </View>

              {uploadProgress && (
                <View
                  className={`mb-4 rounded-lg border p-3 ${
                    isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <View className='mb-2 flex-row items-center'>
                    {uploadProgress.status === 'processing' ? (
                      <ActivityIndicator
                        size='small'
                        color={isDarkMode ? '#34d399' : '#059669'}
                        style={{ marginRight: 8 }}
                      />
                    ) : uploadProgress.status === 'completed' ? (
                      <CheckCircle size={18} color={isDarkMode ? '#34d399' : '#059669'} style={{ marginRight: 8 }} />
                    ) : (
                      <AlertCircle size={18} color={isDarkMode ? '#f87171' : '#ef4444'} style={{ marginRight: 8 }} />
                    )}
                    <Text className={`text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                      {uploadProgress.status === 'processing'
                        ? 'Processing Document'
                        : uploadProgress.status === 'completed'
                          ? 'Upload Complete'
                          : 'Upload Failed'}
                    </Text>
                  </View>
                  <Text className={`mb-2 text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {uploadProgress.filename}
                  </Text>
                  <View
                    className={`mb-2 h-2 overflow-hidden rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                  >
                    <View
                      className='h-2'
                      style={{
                        width: `${uploadProgress.percentage}%`,
                        backgroundColor:
                          uploadProgress.status === 'failed'
                            ? isDarkMode
                              ? '#f87171'
                              : '#ef4444'
                            : isDarkMode
                              ? '#34d399'
                              : '#059669',
                      }}
                    />
                  </View>
                  <Text className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {uploadProgress.message}
                  </Text>
                  {uploadProgress.status === 'completed' && (
                    <View className={`mt-2 rounded-md p-2 ${isDarkMode ? 'bg-emerald-950/50' : 'bg-green-50'}`}>
                      <Text className={`text-xs ${isDarkMode ? 'text-emerald-300' : 'text-green-800'}`}>
                        Extracted {uploadProgress.entitiesCount} entities & {uploadProgress.relationshipsCount}{' '}
                        relationships
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View className='mb-4 max-h-56'>
                <Text className={`mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Uploaded Files
                </Text>
                {uploadedFiles.length === 0 && !uploadProgress && (
                  <View className={`items-center rounded-lg p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No documents uploaded yet.
                    </Text>
                  </View>
                )}
                <ScrollView>
                  {uploadedFiles.map((file) => (
                    <View
                      key={file.name}
                      className={`mb-2 flex-row items-center justify-between rounded-lg px-3 py-2 ${
                        isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                      }`}
                    >
                      <View className='mr-2 flex-1'>
                        <Text
                          className={`text-xs font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}
                          numberOfLines={1}
                        >
                          {file.name}
                        </Text>
                        <Text className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {(file.size / 1024).toFixed(1)} KB · {file.type}
                        </Text>
                      </View>
                      <DeleteFileButton
                        onDelete={async () => {
                          try {
                            if (file.upload_id) {
                              await goalsApi.deleteUploadedFile(file.upload_id);
                            }
                            const files = await goalsApi.getUploadedFiles(userEmail);
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
                            Alert.alert('Error', 'Failed to delete file');
                            throw err; // Re-throw to trigger error state in button
                          }
                        }}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View className='flex-row justify-end gap-2 space-x-3'>
                <TouchableOpacity
                  onPress={() => setShowUploadModal(false)}
                  className={`rounded-lg px-4 py-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                >
                  <Text className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    // Custom upload handler to check PDF type before uploading
                    try {
                      const file = await pickDocument();
                      if (!file) return;

                      // Check for PDF by mimeType or extension
                      const isPdf =
                        (file.mimeType && file.mimeType.toLowerCase() === 'application/pdf') ||
                        (file.name && file.name.toLowerCase().endsWith('.pdf'));

                      if (!isPdf) {
                        if (Platform.OS === 'web') {
                          window.alert('Only PDF files can be uploaded. Please select a PDF document.');
                        } else {
                          Alert.alert('Invalid File', 'Only PDF files can be uploaded. Please select a PDF document.');
                        }
                        return;
                      }

                      // Check if file is already being uploaded
                      if (uploadingFileId === file.name) {
                        Alert.alert(
                          'Upload in Progress',
                          'This file is already being uploaded. Please wait for it to complete.'
                        );
                        return;
                      }

                      // Check if file is already uploaded
                      if (uploadedFiles.some((f) => f.name === file.name)) {
                        Alert.alert('File Already Uploaded', 'This file has already been uploaded.');
                        return;
                      }

                      // Test if backend is reachable
                      const isBackendReachable = await goalsApi.testBackendConnection();
                      if (!isBackendReachable) {
                        console.error('Backend not reachable');
                        Alert.alert(
                          'Connection Error',
                          'Cannot connect to the backend server. Please make sure the API server is running.'
                        );
                        return;
                      }

                      // Step 2: Start upload process
                      setIsUploading(true);
                      setUploadingFileId(file.name);
                      setUploadingUploadId('temp-id');
                      setUploadProgress({
                        uploadId: 'temp-id',
                        filename: file.name,
                        percentage: 5,
                        message: 'Preparing file for upload...',
                        status: 'processing',
                        entitiesCount: 0,
                        relationshipsCount: 0,
                      });

                      // Step 3: Simulate file preparation
                      await new Promise((resolve) => setTimeout(resolve, 500));
                      setUploadProgress((prev) =>
                        prev
                          ? {
                              ...prev,
                              message: 'Reading file content...',
                              percentage: 10,
                            }
                          : null
                      );

                      // Step 4: Upload file to server
                      await new Promise((resolve) => setTimeout(resolve, 300));
                      setUploadProgress((prev) =>
                        prev
                          ? {
                              ...prev,
                              message: 'Uploading file to server...',
                              percentage: 15,
                            }
                          : null
                      );

                      const { upload_id } = await uploadFileToServer(file);

                      setUploadingUploadId(upload_id);
                      setUploadProgress((prev) =>
                        prev
                          ? {
                              ...prev,
                              uploadId: upload_id,
                              message: 'File uploaded successfully, starting analysis...',
                              percentage: 25,
                            }
                          : null
                      );

                      // Step 5: Monitor progress with enhanced messaging
                      if (uploadMonitorActiveRef.current) {
                        console.log('Upload monitor already active, skipping new interval');
                        return;
                      }
                      uploadMonitorActiveRef.current = true;
                      const progressInterval = setInterval(async () => {
                        try {
                          const progress = await monitorUploadProgress(upload_id);

                          // Enhanced progress messages based on percentage
                          let enhancedMessage = progress.message;
                          if (progress.percentage <= 30) {
                            enhancedMessage = 'Extracting text from document...';
                          } else if (progress.percentage <= 50) {
                            enhancedMessage = 'Analyzing document structure...';
                          } else if (progress.percentage <= 70) {
                            enhancedMessage = 'Identifying medical entities...';
                          } else if (progress.percentage <= 90) {
                            enhancedMessage = 'Extracting relationships and connections...';
                          } else if (progress.percentage < 100) {
                            enhancedMessage = 'Finalizing analysis...';
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
                          if (progress.status === 'completed' || progress.status === 'failed') {
                            clearInterval(progressInterval);
                            setIsUploading(false);
                            setUploadingFileId(null);
                            setUploadingUploadId(null);
                            uploadMonitorActiveRef.current = false;

                            if (progress.status === 'completed') {
                              // Show completion message briefly
                              setUploadProgress((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      message: 'Analysis complete! Document processed successfully.',
                                      percentage: 100,
                                    }
                                  : null
                              );

                              // Refresh uploaded files list from backend
                              try {
                                if (!userEmail) {
                                  console.warn('User email is undefined, skipping file refresh');
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
                                console.warn('Failed to refresh uploaded files', err);
                              }

                              Alert.alert('Success', 'Document uploaded and analyzed successfully!');
                            } else {
                              Alert.alert('Error', 'Document processing failed. Please try again.');
                            }

                            // Clear progress after a delay
                            setTimeout(() => {
                              setUploadProgress(null);
                            }, 3000);
                          }
                        } catch (error) {
                          console.error('Progress monitoring error:', error);
                          clearInterval(progressInterval);
                          setIsUploading(false);
                          setUploadingFileId(null);
                          setUploadingUploadId(null);
                          setUploadProgress(null);
                          uploadMonitorActiveRef.current = false;
                          Alert.alert('Error', 'Failed to monitor upload progress. Please try again.');
                        }
                      }, 1000); // Check progress every second
                    } catch (error) {
                      console.error('Upload error:', error);
                      setIsUploading(false);
                      setUploadingFileId(null);
                      setUploadingUploadId(null);
                      setUploadProgress(null);
                      Alert.alert(
                        'Error',
                        `Upload failed: ${
                          error instanceof Error ? error.message : 'Unknown error'
                        }. Please check if the backend server is running and try again.`
                      );
                    }
                  }}
                  disabled={isUploading || generatingPlan}
                  className={`rounded-lg px-4 py-2 ${
                    isUploading
                      ? isDarkMode
                        ? 'bg-emerald-900'
                        : 'bg-emerald-300'
                      : isDarkMode
                        ? 'bg-emerald-700'
                        : 'bg-emerald-600'
                  }`}
                >
                  <Text className='text-sm font-medium text-white'>
                    {isUploading ? 'Uploading...' : 'Upload Document'}
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
          animationType='fade'
          onRequestClose={() => setShowPreferencesModal(false)}
        >
          <View
            style={{
              flex: 1,
              paddingHorizontal: 16,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              className={`mx-4 w-full max-w-md rounded-xl p-5 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
              style={{ elevation: 20 }}
            >
              <View className='mb-4 flex-row items-center justify-between'>
                <Text className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                  Weekly Preferences
                </Text>
                <TouchableOpacity onPress={() => setShowPreferencesModal(false)} className='p-1'>
                  <X size={20} color={isDarkMode ? '#d1d5db' : '#6b7280'} />
                </TouchableOpacity>
              </View>

              {preferencesLoading ? (
                <View className='items-center py-6'>
                  <ActivityIndicator color={isDarkMode ? '#34d399' : '#059669'} />
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 420 }}>
                  {Object.values(PillarType).map((pillar) => (
                    <View
                      key={pillar}
                      className={`mb-4 rounded-lg border p-3 ${
                        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'
                      }`}
                    >
                      <Text className={`mb-2 font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        {pillar}
                      </Text>
                      <View className='mb-2 flex-row'>
                        <View className='mr-2 flex-1'>
                          <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Preferred Time (HH:mm)
                          </Text>
                          <TextInput
                            className={`rounded border px-2 py-1 ${
                              isDarkMode
                                ? 'border-gray-700 bg-gray-900 text-gray-100'
                                : 'border-gray-300 bg-white text-gray-800'
                            }`}
                            value={timePreferences[pillar]?.preferred_time || ''}
                            onChangeText={(t) => updatePrefField(pillar, 'preferred_time', t)}
                            placeholder='07:00'
                            placeholderTextColor={isDarkMode ? '#9ca3af' : undefined}
                          />
                        </View>
                        <View className='w-28'>
                          <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Duration (min)
                          </Text>
                          <TextInput
                            className={`rounded border px-2 py-1 ${
                              isDarkMode
                                ? 'border-gray-700 bg-gray-900 text-gray-100'
                                : 'border-gray-300 bg-white text-gray-800'
                            }`}
                            keyboardType='numeric'
                            value={String(timePreferences[pillar]?.duration_minutes ?? 30)}
                            onChangeText={(t) => updatePrefField(pillar, 'duration_minutes', parseInt(t || '0'))}
                            placeholder='30'
                            placeholderTextColor={isDarkMode ? '#9ca3af' : undefined}
                          />
                        </View>
                      </View>

                      <View className='mb-2 flex-row'>
                        <View className='w-40'>
                          <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Reminder (min)
                          </Text>
                          <TextInput
                            className={`rounded border px-2 py-1 ${
                              isDarkMode
                                ? 'border-gray-700 bg-gray-900 text-gray-100'
                                : 'border-gray-300 bg-white text-gray-800'
                            }`}
                            keyboardType='numeric'
                            value={String(timePreferences[pillar]?.reminder_before_minutes ?? 10)}
                            onChangeText={(t) => updatePrefField(pillar, 'reminder_before_minutes', parseInt(t || '0'))}
                            placeholder='10'
                            placeholderTextColor={isDarkMode ? '#9ca3af' : undefined}
                          />
                        </View>
                      </View>

                      <Text className={`mb-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Days of Week
                      </Text>
                      <View className='flex-row'>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, idx) => {
                          const active = (timePreferences[pillar]?.days_of_week || []).includes(idx);
                          return (
                            <TouchableOpacity
                              key={`${pillar}-${idx}`}
                              onPress={() => toggleDay(pillar, idx)}
                              className={`mr-2 rounded px-2 py-1 ${
                                active
                                  ? isDarkMode
                                    ? 'bg-emerald-700'
                                    : 'bg-emerald-600'
                                  : isDarkMode
                                    ? 'bg-gray-700'
                                    : 'bg-gray-200'
                              }`}
                            >
                              <Text
                                className={`text-xs ${
                                  active ? 'text-white' : isDarkMode ? 'text-gray-200' : 'text-gray-700'
                                }`}
                              >
                                {label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}

              <View className='mt-3 flex-row justify-end'>
                <TouchableOpacity
                  onPress={() => setShowPreferencesModal(false)}
                  className={`rounded-lg px-4 py-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} mr-2`}
                >
                  <Text className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={preferencesLoading}
                  onPress={savePreferences}
                  className={`rounded-lg px-4 py-2 ${
                    preferencesLoading
                      ? isDarkMode
                        ? 'bg-emerald-900'
                        : 'bg-emerald-300'
                      : isDarkMode
                        ? 'bg-emerald-700'
                        : 'bg-emerald-600'
                  }`}
                >
                  <Text className='text-sm font-medium text-white'>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={{ height: '100%', backgroundColor: isDarkMode ? '#111827' : '#F0FDF4' }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        <View style={{ paddingTop: 16, gap: 16 }}>
          <GeneratingBanner />

          {/* Show loading indicator while refreshing (when goals exist) */}
          {loading && goals.length > 0 && (
            <View
              style={{
                backgroundColor: isDarkMode ? '#1e40af' : '#dbeafe',
                borderRadius: 12,
                padding: 12,
                marginHorizontal: 16,
                marginTop: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator size='small' color={isDarkMode ? '#60a5fa' : '#1d4ed8'} />
              <Text
                style={{ color: isDarkMode ? '#93c5fd' : '#1e40af', marginLeft: 12, fontSize: 13, fontWeight: '500' }}
              >
                Refreshing goals...
              </Text>
            </View>
          )}

          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            {/* Week Navigation (hidden) */}
            {false && (
              <Card className='border-0'>
                <View className='flex-row items-center justify-between p-4'>
                  <TouchableOpacity onPress={() => handleWeekChange('prev')} className='p-2'>
                    <ChevronLeft size={20} color='#059669' />
                  </TouchableOpacity>
                  <View className='items-center'>
                    <Text className='font-semibold text-gray-800'>Week of {formatDate(weekStart)}</Text>
                    <Text className='text-sm text-gray-600'>
                      {completedGoals}/{totalGoals} goals completed
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleWeekChange('next')} className='p-2'>
                    <ChevronRight size={20} color='#059669' />
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            {/* Progress Overview (hidden) */}
            {false && (
              <Card className='border-0'>
                <View className='p-4'>
                  <View className='mb-3 flex-row items-center'>
                    <BarChart3 size={20} color='#059669' className='mr-2' />
                    <Text className='text-lg font-semibold text-gray-800'>Weekly Progress</Text>
                  </View>
                  <View className='mb-2 flex-row items-center justify-between'>
                    <Text className='text-sm text-gray-600'>Completion Rate</Text>
                    <Text className='text-sm font-semibold text-gray-800'>{completionRate.toFixed(0)}%</Text>
                  </View>
                  <View className='h-3 rounded-full bg-gray-200'>
                    <View
                      className='h-3 rounded-full'
                      style={{
                        backgroundColor: '#114131',
                        width: `${completionRate}%`,
                      }}
                    />
                  </View>
                  <View className='mt-3 flex-row justify-between'>
                    <View className='items-center'>
                      <Text className='text-2xl font-bold' style={{ color: '#114131' }}></Text>
                      <Text className='text-xs text-gray-600'>Completed</Text>
                    </View>
                    <View className='items-center'>
                      <Text className='text-2xl font-bold text-gray-400'></Text>
                      <Text className='text-xs text-gray-600'>Remaining</Text>
                    </View>
                    <View className='items-center'>
                      <Text className='text-2xl font-bold text-blue-600'></Text>
                      <Text className='text-xs text-gray-600'>Total</Text>
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
                  console.log('View all goals');
                }}
              />
            )}

            {/* Empty State */}
            {!loading && goals.length === 0 && (
              <View
                style={{
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  borderRadius: 16,
                  padding: 32,
                  marginBottom: 16,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDarkMode ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Target size={32} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: isDarkMode ? '#f3f4f6' : '#1f2937',
                    marginBottom: 8,
                    textAlign: 'center',
                  }}
                >
                  No Goals Yet
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    textAlign: 'center',
                    marginBottom: 24,
                    lineHeight: 20,
                  }}
                >
                  Start your health journey by creating your first goal. Track progress, build habits, and achieve
                  lasting wellness.
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAddGoal(true)}
                  style={{
                    backgroundColor: isDarkMode ? '#059669' : '#114131',
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  activeOpacity={0.8}
                >
                  <Plus size={18} color='#ffffff' style={{ marginRight: 8 }} />
                  <Text
                    style={{
                      color: '#ffffff',
                      fontSize: 16,
                      fontWeight: '600',
                    }}
                  >
                    Create Your First Goal
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Goals List */}
            {goals.map((goal: ExtendedGoal) => (
              <View
                key={goal.id}
                style={{
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDarkMode ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <View>
                  <View style={{ marginBottom: 16 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 20, marginRight: 8 }}>{getCategoryIcon(goal.category)}</Text>
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: '600',
                            flex: 1,
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          }}
                        >
                          {goal.title}
                        </Text>
                        {/* Circular Progress Ring */}
                        <View style={{ marginLeft: 10 }}>
                          <CircularProgressRing
                            size={54}
                            strokeWidth={4}
                            progress={getGoalCompletionPercentage(goal.id)}
                            color={
                              getGoalCompletionPercentage(goal.id) >= 80
                                ? '#10b981' // Green for high completion
                                : getGoalCompletionPercentage(goal.id) >= 50
                                  ? '#f59e0b' // Yellow for medium completion
                                  : '#ef4444' // Red for low completion
                            }
                            backgroundColor={isDarkMode ? '#374151' : '#e5e7eb'}
                            showPercentage={true}
                            textColor={isDarkMode ? '#d1d5db' : '#374151'}
                          />
                        </View>
                      </View>
                    </View>
                    {!goal.action_plan && (
                      <TouchableOpacity
                        onPress={() => handleGeneratePlan(goal.id, goal)}
                        disabled={generatingPlan}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          backgroundColor: '#10b981',
                          borderRadius: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: generatingPlan ? 0.5 : 1,
                          marginBottom: 8,
                        }}
                        activeOpacity={0.7}
                      >
                        {generatingPlan ? (
                          <ActivityIndicator size='small' color='#ffffff' />
                        ) : (
                          <View style={{ marginRight: 8 }}>
                            <BarChart3 size={18} color='#ffffff' />
                          </View>
                        )}
                        <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                          {generatingPlan ? 'Generating…' : 'Generate Plan'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color:
                            goal.priority === 'high' ? '#ef4444' : goal.priority === 'medium' ? '#f59e0b' : '#10b981',
                        }}
                      >
                        {goal.priority.toUpperCase()} PRIORITY
                      </Text>
                    </View>
                  </View>

                  {/* Action Items */}
                  {(goal.action_plan?.action_items?.length ?? 0) > 0 && (
                    <View className='mt-4'>
                      <Text className={`mb-2 text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        Action Items
                      </Text>
                      <View>
                        {goal.action_plan?.action_items?.map((item) => (
                          <ActionItemCard key={item.title} item={item} onPress={() => setSelectedActionItem(item)} />
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Use GoalProgressTracker component for measurable goals */}
                  {goal.target_value && (
                    <GoalProgressTracker
                      goalId={goal.id}
                      title=''
                      currentValue={goal.current_value || 0}
                      targetValue={goal.target_value}
                      unit={goal.unit || ''}
                      onProgressUpdate={handleUpdateProgress}
                      showQuickActions={true}
                    />
                  )}
                </View>
              </View>
            ))}

            {/* Weekend Reflection */}
            {new Date().getDay() === 0 && ( // Sunday
              <Card className='border-0 bg-blue-50'>
                <View className='p-4'>
                  <View className='mb-3 flex-row items-center'>
                    <BookOpen size={20} color='#3b82f6' className='mr-2' />
                    <Text className='text-lg font-semibold text-blue-800'>Weekly Reflection</Text>
                  </View>
                  <Text className='mb-3 text-sm text-blue-700'>
                    Take a moment to reflect on your week and plan for the next one.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowReflection(true)}
                    className='self-start rounded-lg bg-blue-600 px-4 py-2'
                  >
                    <Text className='font-medium text-white'>Start Reflection</Text>
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
                  'Set a daily reminder',
                  'Track progress in the morning',
                  'Review goals before bed',
                  'Celebrate small wins',
                ]}
                completedHabits={['Set a daily reminder']}
                onHabitToggle={(habit) => {
                  // Handle habit toggle
                  console.log('Habit toggled:', habit);
                }}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Goal Modal */}
      {showAddGoal && (
        <Modal
          visible={showAddGoal}
          transparent
          animationType='fade'
          onRequestClose={() => {
            setShowAddGoal(false);
            setShowSuggestions(false);
          }}
        >
          <KeyboardAvoidingView
            className='flex-1'
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableWithoutFeedback
              onPress={() => {
                Keyboard.dismiss();
                setShowAddGoal(false);
                setShowSuggestions(false);
              }}
            >
              <View className='flex-1 items-center justify-center bg-black bg-opacity-30'>
                <TouchableWithoutFeedback onPress={(e: any) => e.stopPropagation()}>
                  <View className={`m-4 w-full max-w-md rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <ScrollView
                      contentContainerStyle={{ flexGrow: 1 }}
                      keyboardShouldPersistTaps='handled'
                      showsVerticalScrollIndicator={false}
                    >
                      <View className='p-6'>
                        <Text
                          className={`mb-4 text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}
                        >
                          Add New Goal
                        </Text>

                        <TextInput
                          placeholder='Goal title'
                          value={formData.title}
                          onChangeText={(text: string) => setFormData({ ...formData, title: text })}
                          className={`mb-3 rounded-lg border px-3 py-2 ${
                            isDarkMode
                              ? 'border-gray-600 bg-gray-700 text-gray-100'
                              : 'border-gray-300 bg-white text-gray-800'
                          }`}
                          placeholderTextColor={isDarkMode ? '#9ca3af' : undefined}
                          returnKeyType='next'
                          onSubmitEditing={() => {
                            // Focus will automatically move to next input
                          }}
                        />

                        <TextInput
                          placeholder='Description (optional)'
                          value={formData.description}
                          onChangeText={(text: string) => setFormData({ ...formData, description: text })}
                          className={`mb-3 rounded-lg border px-3 py-2 ${
                            isDarkMode
                              ? 'border-gray-600 bg-gray-700 text-gray-100'
                              : 'border-gray-300 bg-white text-gray-800'
                          }`}
                          placeholderTextColor={isDarkMode ? '#9ca3af' : undefined}
                          multiline
                          numberOfLines={3}
                          textAlignVertical='top'
                          returnKeyType='done'
                          onSubmitEditing={Keyboard.dismiss}
                        />

                        {/* Show Suggestions Button */}
                        <TouchableOpacity
                          onPress={() => setShowSuggestions(!showSuggestions)}
                          className={`mb-3 rounded-lg p-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                        >
                          <Text className={`text-center text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>
                            {showSuggestions ? 'Hide Suggestions' : 'Show Suggestions'}
                          </Text>
                        </TouchableOpacity>

                        {/* Goal Suggestions */}
                        {showSuggestions && (
                          <View className='mb-4'>
                            <Text
                              className={`mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}
                            >
                              SUGGESTIONS
                            </Text>
                            <View className='space-y-2'>
                              {[
                                'Sleep 8 hours a day',
                                'Follow recommended diet',
                                'Exercise 4 times a week for 75 min each',
                                'Meditate for 20 min daily',
                                'Connect with social group twice a week after work',
                              ].map((suggestion, index) => (
                                <TouchableOpacity
                                  key={index}
                                  onPress={() => {
                                    setFormData({ ...formData, title: suggestion });
                                  }}
                                  className={`rounded-lg border p-3 ${
                                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                                  }`}
                                >
                                  <Text className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                    {suggestion}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}

                        <View className='mb-3 flex-row justify-between'>
                          <Text className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                            Priority:
                          </Text>
                          <View className='flex-row'>
                            {(['low', 'medium', 'high'] as const).map((priority) => (
                              <TouchableOpacity
                                key={priority}
                                onPress={() => setFormData({ ...formData, priority })}
                                className={`mr-1 rounded px-3 py-1 ${
                                  formData.priority === priority
                                    ? isDarkMode
                                      ? 'bg-emerald-700'
                                      : 'bg-emerald-900'
                                    : isDarkMode
                                      ? 'bg-gray-700'
                                      : 'bg-gray-200'
                                }`}
                              >
                                <Text
                                  className={`text-xs ${
                                    formData.priority === priority
                                      ? 'text-white'
                                      : isDarkMode
                                        ? 'text-gray-200'
                                        : 'text-gray-700'
                                  }`}
                                >
                                  {priority.toUpperCase()}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>

                        <View className='mb-3 flex-row justify-between'>
                          <Text className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                            Category:
                          </Text>
                          <View className='flex-row'>
                            {(['health', 'fitness', 'nutrition', 'mental', 'personal'] as const).map((category) => (
                              <TouchableOpacity
                                key={category}
                                onPress={() => setFormData({ ...formData, category })}
                                className={`mr-1 rounded px-2 py-1 ${
                                  formData.category === category
                                    ? isDarkMode
                                      ? 'bg-emerald-700'
                                      : 'bg-emerald-900'
                                    : isDarkMode
                                      ? 'bg-gray-700'
                                      : 'bg-gray-200'
                                }`}
                              >
                                <Text
                                  className={`text-xs ${
                                    formData.category === category
                                      ? 'text-white'
                                      : isDarkMode
                                        ? 'text-gray-200'
                                        : 'text-gray-700'
                                  }`}
                                >
                                  {category}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>

                        <View className='flex-row'>
                          <TouchableOpacity
                            onPress={() => {
                              setShowAddGoal(false);
                              setShowSuggestions(false);
                            }}
                            className={`mr-2 flex-1 rounded-lg px-4 py-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}
                          >
                            <Text className={`text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleAddGoal}
                            className='ml-2 flex-1 rounded-lg px-4 py-2'
                            style={{
                              backgroundColor: isDarkMode ? '#059669' : '#114131',
                            }}
                          >
                            <Text className='text-center text-white'>Add Goal</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
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
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <View
            style={{
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              borderRadius: 16,
              padding: 0,
              margin: 16,
              width: '90%',
              maxWidth: 420,
              maxHeight: '85%',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDarkMode ? 0.4 : 0.2,
              shadowRadius: 8,
              elevation: 8,
              overflow: 'hidden',
            }}
          >
            {/* Fixed Header - Non-scrollable */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingHorizontal: 24,
                paddingTop: 24,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
              }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '600',
                    color: isDarkMode ? '#f3f4f6' : '#1f2937',
                    lineHeight: 24,
                  }}
                  numberOfLines={2}
                  ellipsizeMode='tail'
                >
                  {selectedActionItem?.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedActionItem(null)}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                }}
                activeOpacity={0.7}
              >
                <X size={20} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content Area */}
            <ScrollView
              style={{ maxHeight: 400 }}
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Description Section - Collapsible for long content */}
              {selectedActionItem?.description && (
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      fontWeight: '500',
                      color: isDarkMode ? '#f3f4f6' : '#1f2937',
                      marginBottom: 8,
                      fontSize: 16,
                    }}
                  >
                    Description
                  </Text>
                  <Text
                    style={{
                      color: isDarkMode ? '#d1d5db' : '#6b7280',
                      fontSize: 14,
                      lineHeight: 20,
                    }}
                    numberOfLines={4}
                    ellipsizeMode='tail'
                  >
                    {selectedActionItem?.description}
                  </Text>
                </View>
              )}

              {/* Weekly Schedule Section - Main focus */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontWeight: '600',
                    color: isDarkMode ? '#f3f4f6' : '#1f2937',
                    marginBottom: 16,
                    fontSize: 18,
                  }}
                >
                  Weekly Schedule
                </Text>

                {Object.entries(selectedActionItem?.weekly_schedule || {}).map(([day, schedule]: [string, any]) =>
                  schedule && schedule.time_slots && schedule.time_slots.length > 0 ? (
                    <View key={day} style={{ marginBottom: 16 }}>
                      <View
                        style={{
                          backgroundColor: isDarkMode ? '#065f46' : '#d1fae5',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontWeight: '600',
                            color: isDarkMode ? '#34d399' : '#059669',
                            fontSize: 15,
                            textAlign: 'center',
                          }}
                        >
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </Text>
                      </View>

                      {schedule.time_slots.map((slot: any, index: number) => (
                        <View
                          key={index}
                          style={{
                            backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
                            padding: 16,
                            borderRadius: 12,
                            marginBottom: 8,
                            borderLeftWidth: 4,
                            borderLeftColor: isDarkMode ? '#34d399' : '#10b981',
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 16,
                                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                fontWeight: '600',
                              }}
                            >
                              {slot.start_time} - {slot.end_time}
                            </Text>
                            <View
                              style={{
                                backgroundColor: isDarkMode ? '#065f46' : '#ecfdf5',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 12,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: isDarkMode ? '#34d399' : '#059669',
                                  fontWeight: '500',
                                }}
                              >
                                {slot.duration}
                              </Text>
                            </View>
                          </View>

                          {slot.health_notes && slot.health_notes.length > 0 && (
                            <View
                              style={{
                                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                padding: 8,
                                borderRadius: 6,
                                marginTop: 8,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                                  fontStyle: 'italic',
                                  lineHeight: 16,
                                }}
                              >
                                💡 {slot.health_notes[0]}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : null
                )}
              </View>
            </ScrollView>

            {/* Fixed Footer - Non-scrollable */}
            <View
              style={{
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderTopWidth: 1,
                borderTopColor: isDarkMode ? '#374151' : '#e5e7eb',
                backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
              }}
            >
              <TouchableOpacity
                onPress={() => setSelectedActionItem(null)}
                style={{
                  backgroundColor: '#10b981',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: 16,
                  }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
