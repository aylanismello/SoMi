import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';

export default function App() {
  const [sliderValue, setSliderValue] = useState(50);

  const handleSOS = () => {
    console.log('SOS pressed');
    // Add your SOS logic here
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.content}>
        <Text style={styles.question}>
          how in your body{'\n'}do you feel right now?
        </Text>

        <View style={styles.sliderContainer}>
          <View style={styles.sliderWrapper}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              value={sliderValue}
              onValueChange={setSliderValue}
              minimumTrackTintColor="#ffffff"
              maximumTrackTintColor="#ffffff"
              thumbTintColor="#ffffff"
            />
          </View>

          <View style={styles.labelsContainer}>
            <Text style={styles.label}>0%</Text>
            <Text style={styles.label}>100%</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.sosButton}
        onPress={handleSOS}
        activeOpacity={0.7}
      >
        <Text style={styles.sosText}>sos</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: 30,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  question: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '400',
    marginBottom: 60,
    textAlign: 'left',
    lineHeight: 36,
  },
  sliderContainer: {
    width: '100%',
  },
  sliderWrapper: {
    paddingHorizontal: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  label: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '400',
  },
  sosButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#ff6b6b',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 40,
  },
  sosText: {
    color: '#ff6b6b',
    fontSize: 24,
    fontWeight: '400',
  },
});
