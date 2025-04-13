/**
 * Task Log Model
 * Schema for logging task execution steps and actions
 */

import mongoose from 'mongoose';

const TaskLogSchema = new mongoose.Schema({
    // Task ID (for grouping related log entries)
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },

    // Original prompt from user
    prompt: {
        type: String,
        required: false
    },

    // Timestamp when the log entry was created
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },

    // Type of step (task_start, reasoning, action_start, action_complete, action_error, task_complete, task_error)
    stepType: {
        type: String,
        required: true,
        enum: ['task_start', 'reasoning', 'action_start', 'action_complete', 'action_error', 'task_complete', 'task_error']
    },

    // Data specific to the step (varies based on stepType)
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    }
}, {
    // Enable timestamps for createdAt and updatedAt
    timestamps: true
});

// Add index for faster queries
TaskLogSchema.index({ taskId: 1, timestamp: 1 });

// Method to get all steps for a specific task
TaskLogSchema.statics.getTaskSteps = async function (taskId) {
    return await this.find({ taskId }).sort({ timestamp: 1 });
};

// Method to summarize task execution
TaskLogSchema.statics.summarizeTask = async function (taskId) {
    const steps = await this.find({ taskId }).sort({ timestamp: 1 });

    if (steps.length === 0) {
        return null;
    }

    const startLog = steps.find(step => step.stepType === 'task_start');
    const endLog = steps.find(step =>
        step.stepType === 'task_complete' || step.stepType === 'task_error'
    );

    const reasoningSteps = steps.filter(step => step.stepType === 'reasoning');
    const actionSteps = steps.filter(step =>
        step.stepType === 'action_start' || step.stepType === 'action_complete' || step.stepType === 'action_error'
    );

    // Calculate success rate
    const actionCount = steps.filter(step => step.stepType === 'action_start').length;
    const successCount = steps.filter(step => step.stepType === 'action_complete').length;
    const errorCount = steps.filter(step => step.stepType === 'action_error').length;

    const successRate = actionCount > 0 ? (successCount / actionCount) * 100 : 0;

    return {
        taskId,
        prompt: startLog?.prompt,
        startTime: startLog?.timestamp,
        endTime: endLog?.timestamp,
        duration: endLog?.timestamp && startLog?.timestamp
            ? endLog.timestamp - startLog.timestamp
            : null,
        reasoningStepCount: reasoningSteps.length,
        actionCount,
        successCount,
        errorCount,
        successRate,
        status: endLog?.stepType === 'task_complete' ? 'complete' : 'error',
        error: endLog?.stepType === 'task_error' ? endLog.data?.error : null
    };
};

const TaskLog = mongoose.model('TaskLog', TaskLogSchema);

export default TaskLog; 