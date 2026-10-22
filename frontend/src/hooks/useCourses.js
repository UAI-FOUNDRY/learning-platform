import { useState, useEffect } from 'react';
import { courseService } from '../services/courseService';

export function useCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchCourses() {
      try {
        setLoading(true);
        const data = await courseService.getCourses();
        const list = Array.isArray(data) ? data : (data?.courses || data?.items || []);
        if (isMounted) {
          setCourses(list);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load courses from the server');
          setCourses([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  return { courses, loading, error };
}
