import { useSpring, animated } from 'react-spring';

const PushUpExercise = () => {
  const props = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
  });

  return (
    <animated.div style={props}>Push Up Exercise</animated.div>
  );
};
export default PushUpExercise;