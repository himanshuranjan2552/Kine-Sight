import { useSpring, animated } from 'react-spring';

const BicepCurlExercise = () => {
  const props = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
  });

  return (
    <animated.div style={props}>Bicep Curl Exercise</animated.div>
  );
};
export default BicepCurlExercise;