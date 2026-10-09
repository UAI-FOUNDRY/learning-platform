import { useState, useEffect } from 'react';
import { mockCourses } from '../data/mockCourses';

export function useCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial static mock data placeholder
    setCourses(mockCourses);
    setLoading(false);
  }, []);

  return { courses, loading };
}
