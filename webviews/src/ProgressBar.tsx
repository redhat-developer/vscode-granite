import React, { useEffect, useState } from "react";
import { ProgressData } from "../../src/commons/progressData";

// Utility function to format time remaining
const formatTime = (seconds: number) => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 900) { // 15 minutes
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

// The ProgressBar component
const ProgressBar: React.FC<{ data: ProgressData; id: string }> = ({ data, id }) => {
  const [speed, setSpeed] = useState(0); // MB/s
  const [, setElapsedTime] = useState(0); // Time since start in seconds
  const [previousCompleted, setPreviousCompleted] = useState(data.completed); // Store previous completed value to calculate speed
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);

  const SPEED_HISTORY_LENGTH = 50; // Number of data points to use for smoothing

  const [status, setStatus] = useState("");
  const [completedSize, setCompletedSize] = useState("0 MB");
  const [totalSize, setTotalSize] = useState("0 MB");
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [estimatedCompletion, setEstimatedCompletion] = useState("0s");

  useEffect(() => {
    if (data.key !== id) {
      return;
    }
    const now = Date.now();
    const timeDiff = (now - lastUpdateTime) / 1000; // Convert to seconds

    // Calculate speed in MB/s
    const completedMB = data.completed !== undefined ? data.completed / (1024 * 1024) : 0;
    const prevCompletedMB = previousCompleted !== undefined ? previousCompleted / (1024 * 1024) : 0;
    const deltaMB = Math.max(0, completedMB - prevCompletedMB); // Ensure non-negative delta
    setStatus(data.status);
    // Update speed (MB/s)
    const newSpeed = timeDiff > 0 ? deltaMB / timeDiff : 0;

    // Update speed history
    setSpeedHistory(prevHistory => {
      const updatedHistory = [...prevHistory, newSpeed].slice(-SPEED_HISTORY_LENGTH);
      const averageSpeed = updatedHistory.reduce((sum, speed) => sum + speed, 0) / updatedHistory.length;
      setSpeed(Math.max(0, averageSpeed)); // Ensure non-negative average speed
      return updatedHistory;
    });

    setElapsedTime((prev) => prev + timeDiff);
    setPreviousCompleted(data.completed);
    setLastUpdateTime(now);

    // Update size and progress information
    setCompletedSize(data.completed !== undefined ? formatSize(data.completed) : "0 MB");
    setTotalSize(data.total !== undefined ? formatSize(data.total) : "0 MB");
    setProgressPercentage(data.completed !== undefined && data.total !== undefined ? (data.completed / data.total) * 100 : 0);

    const remainingBits = data.total !== undefined && data.completed !== undefined ? data.total - data.completed : 0;
    const remainingSeconds = remainingBits > 0 && speed > 0 ? remainingBits / (speed * 1024 * 1024) : 0;
    setEstimatedCompletion(formatTime(remainingSeconds));
  }, [data.completed]);



  useEffect(() => {
    // Reset all state for new download
    setStatus("");
    setSpeed(0);
    setElapsedTime(0);
    setPreviousCompleted(0);
    setLastUpdateTime(0);
    setSpeedHistory([]);
    // Reset new state variables
    setCompletedSize("");
    setTotalSize("");
    setProgressPercentage(0);
    setEstimatedCompletion("Universe heat death");
  }, [id]);

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  if (data.key !== id || speedHistory.length === 0) {
    return <></>;
  }

  return (
    <div>
      <label className="progress-status">{status}</label>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{
          flex: '0 0 80%',
          marginRight: '10px'
        }} >
          <div style={{
            height: "8px",
            backgroundColor: "#e0e0df",
            borderRadius: "5px",
          }}>
            <div className="progress-bar"
              style={{
                width: `${progressPercentage}%`,
                height: '100%',
                borderRadius: '5px'
              }}
            />
          </div>
          <div style={{ textAlign: 'right', fontSize: '10px', marginTop: '5px' }}>
            {completedSize.padStart(10)} / {totalSize.padStart(10)} at {speed.toFixed(2).padStart(7)} MB/s
          </div>
        </div>
        <div style={{ whiteSpace: 'nowrap', flex: '1', fontSize: '12px' }}>
          {data.completed! < data.total! && `est. time: ~${estimatedCompletion}`}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
