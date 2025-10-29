import { useState, useEffect, useRef } from 'react';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View, TouchableOpacity, Text, Pressable, Dimensions, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

const videoSource = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/overwhelmed_vagus_tone.mp4';

// Get screen dimensions for 9:16 aspect ratio calculation
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

export default function PlayerScreen({ navigation }) {
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const progressBarRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const player = useVideoPlayer(videoSource, player => {
    player.play();
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  // Track video progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (player) {
        setCurrentTime(player.currentTime || 0);
        setDuration(player.duration || 0);
      }
    }, 100); // Update every 100ms for smooth progress

    return () => clearInterval(interval);
  }, [player]);

  // Animate controls visibility
  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: showControls ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showControls, controlsOpacity]);

  // Auto-hide controls after 3 seconds when playing
  useEffect(() => {
    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Only set timeout if controls are visible
    if (showControls) {
      hideTimeoutRef.current = setTimeout(() => {
        // Check if still playing when timer fires
        if (player.playing) {
          setShowControls(false);
        }
        hideTimeoutRef.current = null;
      }, 3000);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [showControls, player]);

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleSkipBackward = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newTime = Math.max(0, currentTime - 15);
    player.currentTime = newTime;
    setShowControls(true);
  };

  const handleSkipForward = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newTime = Math.min(duration, currentTime + 15);
    player.currentTime = newTime;
    setShowControls(true);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    player.pause();
    navigation.goBack();
  };

  const toggleControls = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowControls(!showControls);
  };

  const handleProgressBarPress = (event) => {
    if (!progressBarRef.current || !duration) return;

    progressBarRef.current.measure((x, y, width, height, pageX, pageY) => {
      const touchX = event.nativeEvent.pageX - pageX;
      const seekPosition = (touchX / width) * duration;
      const clampedPosition = Math.max(0, Math.min(duration, seekPosition));

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      player.currentTime = clampedPosition;
      setShowControls(true);
    });
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <View style={styles.container}>
      <Pressable style={styles.videoContainer} onPress={toggleControls}>
        <VideoView
          style={styles.video}
          player={player}
          nativeControls={false}
          contentFit="cover"
        />
      </Pressable>

      <Animated.View
        style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
        pointerEvents={showControls ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.controlsContainer}>
          {/* Skip backward button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipBackward}
          >
            <View style={styles.skipBackIcon}>
              <Text style={styles.skipArrow}>⟲</Text>
            </View>
            <Text style={styles.skipText}>15</Text>
          </TouchableOpacity>

          {/* Play/Pause button */}
          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={handlePlayPause}
          >
            <Text style={styles.playPauseText}>
              {isPlaying ? '❚❚' : '▶'}
            </Text>
          </TouchableOpacity>

          {/* Skip forward button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipForward}
          >
            <View style={styles.skipForwardIcon}>
              <Text style={styles.skipArrow}>⟳</Text>
            </View>
            <Text style={styles.skipText}>15</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <Pressable
            ref={progressBarRef}
            style={styles.progressBarTouchable}
            onPress={handleProgressBarPress}
          >
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </Pressable>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: screenWidth,
    height: screenWidth * (16 / 9), // 9:16 aspect ratio (vertical)
    maxHeight: screenHeight,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 30,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
  },
  closeText: {
    color: '#ffffff',
    fontSize: 24,
  },
  controlsContainer: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    top: '50%',
    transform: [{ translateY: -50 }],
    gap: 40,
  },
  playPauseButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playPauseText: {
    color: '#000000',
    fontSize: 36,
  },
  skipButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBackIcon: {
    marginBottom: -6,
  },
  skipForwardIcon: {
    marginBottom: -6,
  },
  skipArrow: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '300',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -4,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 40,
    left: 30,
    right: 30,
  },
  progressBarTouchable: {
    paddingVertical: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff6b6b',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
});
