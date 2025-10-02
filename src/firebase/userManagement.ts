import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  query,
  where,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './config';
import type { UserRequest } from '../types';

const USER_REQUESTS_COLLECTION = 'userRequests';

// Simple hash function for password (in production, use bcrypt or similar)
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const createUserRequest = async (email: string, password: string) => {
  try {
    // Check if request already exists
    const q = query(
      collection(db, USER_REQUESTS_COLLECTION),
      where('email', '==', email)
    );
    const existingRequests = await getDocs(q);

    if (!existingRequests.empty) {
      // Check status of existing request
      const existingRequest = existingRequests.docs[0].data();
      if (existingRequest.status === 'pending') {
        throw new Error('A request for this email is already pending approval');
      } else if (existingRequest.status === 'rejected') {
        throw new Error('Your previous request was rejected. Please contact the administrator.');
      }
    }

    const hashedPassword = await hashPassword(password);

    const requestData = {
      email,
      password: hashedPassword,
      status: 'pending' as const,
      requestedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, USER_REQUESTS_COLLECTION), requestData);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const getUserRequests = async (statusFilter?: 'pending' | 'approved' | 'rejected') => {
  try {
    let q;
    if (statusFilter) {
      q = query(
        collection(db, USER_REQUESTS_COLLECTION),
        where('status', '==', statusFilter),
        orderBy('requestedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, USER_REQUESTS_COLLECTION),
        orderBy('requestedAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    const requests: UserRequest[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        email: data.email,
        password: data.password,
        status: data.status,
        requestedAt: data.requestedAt.toDate(),
        reviewedAt: data.reviewedAt?.toDate(),
        reviewedBy: data.reviewedBy,
      } as UserRequest);
    });

    return requests;
  } catch (error) {
    throw error;
  }
};

export const approveUserRequest = async (
  requestId: string,
  adminEmail: string
) => {
  try {
    // Simply update request status to approved
    // User account will be created when they first sign in
    const requestRef = doc(db, USER_REQUESTS_COLLECTION, requestId);
    await updateDoc(requestRef, {
      status: 'approved',
      reviewedAt: Timestamp.now(),
      reviewedBy: adminEmail,
    });
  } catch (error) {
    throw error;
  }
};

export const rejectUserRequest = async (requestId: string, adminEmail: string) => {
  try {
    const requestRef = doc(db, USER_REQUESTS_COLLECTION, requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
      reviewedAt: Timestamp.now(),
      reviewedBy: adminEmail,
      password: '', // Clear password hash
    });
  } catch (error) {
    throw error;
  }
};

export const deleteUserRequest = async (requestId: string) => {
  try {
    const requestRef = doc(db, USER_REQUESTS_COLLECTION, requestId);
    await deleteDoc(requestRef);
  } catch (error) {
    throw error;
  }
};

export const checkUserRequestStatus = async (email: string): Promise<UserRequest | null> => {
  try {
    const q = query(
      collection(db, USER_REQUESTS_COLLECTION),
      where('email', '==', email),
      orderBy('requestedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      email: data.email,
      password: data.password,
      status: data.status,
      requestedAt: data.requestedAt.toDate(),
      reviewedAt: data.reviewedAt?.toDate(),
      reviewedBy: data.reviewedBy,
    } as UserRequest;
  } catch (error) {
    throw error;
  }
};
