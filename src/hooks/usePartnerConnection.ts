import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { ApiResponse, User } from '../types';
import { useAuthStore } from '../store/authStore';
import { getUserFacingError } from '../lib/userFacingError';

type UserApiResponse = ApiResponse<{ user: User }> & { user?: User };

function unwrapUser(response: UserApiResponse): User {
  const user = response.user ?? response.data?.user;
  if (!user) {
    throw new Error('Phản hồi người dùng không hợp lệ');
  }
  return user;
}

function getErrorMessage(error: unknown, fallback: string) {
  return getUserFacingError(error, fallback);
}

export function usePartnerConnection() {
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  const invalidatePartnerState = () => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['profile-connection-poll'] });
    queryClient.invalidateQueries({ queryKey: ['partner-cycles'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  };

  const refreshProfile = async () => {
    const { data } = await api.get<UserApiResponse>('/users/profile');
    const user = unwrapUser(data);
    setUser(user);
    return user;
  };

  const connectPartner = useMutation({
    mutationFn: async (partnerCode: string) => {
      await api.post('/users/connect-partner', {
        partnerCode: partnerCode.trim().toUpperCase(),
      });
      return refreshProfile();
    },
    onSuccess: () => {
      toast.success('Kết nối Người ấy thành công');
      invalidatePartnerState();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Không thể kết nối Người ấy')),
  });

  const disconnectPartner = useMutation({
    mutationFn: async () => {
      await api.delete('/users/disconnect-partner');
      return refreshProfile();
    },
    onSuccess: () => {
      toast.success('Đã hủy kết nối với Người ấy');
      invalidatePartnerState();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Không thể hủy kết nối')),
  });

  return { connectPartner, disconnectPartner };
}
