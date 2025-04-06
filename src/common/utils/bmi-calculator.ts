export const parseBMIInput = (text: string) => {
  // Metric
  const heightMetricMatch = text.match(/height:\s*(\d+)\s*cm/i);
  const weightMetricMatch = text.match(/weight:\s*(\d+)\s*kg/i);

  // Imperial
  const heightFeetMatch = text.match(/height:\s*(\d+)\s*ft\s*(\d+)\s*in/i);
  const weightLbsMatch = text.match(/weight:\s*(\d+)\s*lbs?/i);

  if (heightMetricMatch && weightMetricMatch) {
    const heightCm = parseFloat(heightMetricMatch[1]);
    const weightKg = parseFloat(weightMetricMatch[1]);
    return { unit: 'metric', heightCm, weightKg };
  }

  if (heightFeetMatch && weightLbsMatch) {
    const feet = parseFloat(heightFeetMatch[1]);
    const inches = parseFloat(heightFeetMatch[2]);
    const weightLbs = parseFloat(weightLbsMatch[1]);
    return { unit: 'imperial', feet, inches, weightLbs };
  }

  return null;
};

export const calculateBMI = (input: ReturnType<typeof parseBMIInput>) => {
  if (!input) return null;

  if (input.unit === 'metric') {
    const heightM = input.heightCm / 100;
    const bmi = input.weightKg / (heightM * heightM);
    return { bmi: parseFloat(bmi.toFixed(1)), unit: 'metric' };
  }

  if (input.unit === 'imperial') {
    const totalInches = input.feet * 12 + input.inches;
    const bmi = (input.weightLbs / (totalInches * totalInches)) * 703;
    return { bmi: parseFloat(bmi.toFixed(1)), unit: 'imperial' };
  }

  return null;
};

export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 24.9) return 'Normal weight';
  if (bmi < 29.9) return 'Overweight';
  return 'Obese';
};
