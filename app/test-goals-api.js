// Test script for Goals API
// Run this in the browser console or as a Node.js script

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';
const TEST_USER_EMAIL = 'test@example.com';

// Helper function to make API requests
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Test functions
async function testCreateGoal() {
  console.log('Testing create goal...');
  const goalData = {
    title: 'Test Goal',
    description: 'This is a test goal',
    priority: 'high',
    category: 'health',
    target_value: 10,
    unit: 'steps',
    user_email: TEST_USER_EMAIL,
  };

  try {
    const result = await makeRequest('/api/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
    console.log('✅ Goal created:', result);
    return result.data.goal.id;
  } catch (error) {
    console.error('❌ Failed to create goal:', error);
    return null;
  }
}

async function testGetGoals() {
  console.log('Testing get goals...');
  try {
    const result = await makeRequest(`/api/goals?user_email=${TEST_USER_EMAIL}`);
    console.log('✅ Goals retrieved:', result);
    return result.data.goals;
  } catch (error) {
    console.error('❌ Failed to get goals:', error);
    return [];
  }
}

async function testUpdateGoalProgress(goalId) {
  console.log('Testing update goal progress...');
  const progressData = {
    goal_id: goalId,
    current_value: 5,
    note: 'Making good progress!',
  };

  try {
    const result = await makeRequest(`/api/goals/${goalId}/progress?user_email=${TEST_USER_EMAIL}`, {
      method: 'POST',
      body: JSON.stringify(progressData),
    });
    console.log('✅ Goal progress updated:', result);
  } catch (error) {
    console.error('❌ Failed to update goal progress:', error);
  }
}

async function testAddGoalNote(goalId) {
  console.log('Testing add goal note...');
  const noteData = {
    goal_id: goalId,
    note: 'This is a test note',
  };

  try {
    const result = await makeRequest(`/api/goals/${goalId}/notes?user_email=${TEST_USER_EMAIL}`, {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
    console.log('✅ Note added:', result);
  } catch (error) {
    console.error('❌ Failed to add note:', error);
  }
}

async function testGetGoalStats() {
  console.log('Testing get goal stats...');
  try {
    const result = await makeRequest(`/api/goals/stats?user_email=${TEST_USER_EMAIL}&weeks=4`);
    console.log('✅ Goal stats retrieved:', result);
  } catch (error) {
    console.error('❌ Failed to get goal stats:', error);
  }
}

async function testSaveWeeklyReflection() {
  console.log('Testing save weekly reflection...');
  const reflectionData = {
    user_email: TEST_USER_EMAIL,
    week_start: new Date().toISOString(),
    week_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    rating: 4,
    reflection: 'This was a great week!',
    next_week_goals: ['Continue exercising', 'Read more books'],
  };

  try {
    const result = await makeRequest('/api/goals/reflection', {
      method: 'POST',
      body: JSON.stringify(reflectionData),
    });
    console.log('✅ Weekly reflection saved:', result);
  } catch (error) {
    console.error('❌ Failed to save weekly reflection:', error);
  }
}

async function testGetCurrentWeekGoals() {
  console.log('Testing get current week goals...');
  try {
    const result = await makeRequest(`/api/goals/current-week?user_email=${TEST_USER_EMAIL}`);
    console.log('✅ Current week goals retrieved:', result);
  } catch (error) {
    console.error('❌ Failed to get current week goals:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Goals API Tests...\n');

  // Test 1: Create a goal
  const goalId = await testCreateGoal();

  if (goalId) {
    // Test 2: Get all goals
    await testGetGoals();

    // Test 3: Update goal progress
    await testUpdateGoalProgress(goalId);

    // Test 4: Add a note
    await testAddGoalNote(goalId);
  }

  // Test 5: Get goal stats
  await testGetGoalStats();

  // Test 6: Save weekly reflection
  await testSaveWeeklyReflection();

  // Test 7: Get current week goals
  await testGetCurrentWeekGoals();

  console.log('\n✨ All tests completed!');
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testCreateGoal,
    testGetGoals,
    testUpdateGoalProgress,
    testAddGoalNote,
    testGetGoalStats,
    testSaveWeeklyReflection,
    testGetCurrentWeekGoals,
  };
} else {
  // Browser environment
  window.testGoalsAPI = {
    runAllTests,
    testCreateGoal,
    testGetGoals,
    testUpdateGoalProgress,
    testAddGoalNote,
    testGetGoalStats,
    testSaveWeeklyReflection,
    testGetCurrentWeekGoals,
  };
}
